#!/bin/bash
# ---------------------------------------------------------------
#  Озвучка для гайда «Модальные конструкции в турецком»
#  Турецкий — системный голос macOS Yelda (tr_TR).
#  Запуск:  python3 tools/forms.py && bash tools/gen-audio.sh
#
#  Хочешь живой голос — запиши mp3 с тем же именем и положи
#  в audio/tr/. Сайт сначала ищет файл и только потом включает
#  синтез речи браузера.
# ---------------------------------------------------------------
set -e
cd "$(dirname "$0")/.."
mkdir -p audio/tr
TMPD=$(mktemp -d); trap 'rm -rf "$TMPD"' EXIT
MAN=tools/manifest.tsv
echo "▸ Фраз в манифесте: $(wc -l < "$MAN" | tr -d ' ')"

# Последовательно: параллельный `say` конфликтует сам с собой.
# Второй проход добирает то, что не получилось с первого раза.
render_pass () {
  local made=0
  while IFS=$'\t' read -r dir voice slug text; do
    [ -z "$slug" ] && continue
    [ -s "audio/$dir/$slug.mp3" ] && continue
    say -v "$voice" -r 165 -o "$TMPD/x.aiff" "$text" 2>/dev/null || continue
    ffmpeg -y -loglevel error -i "$TMPD/x.aiff" -codec:a libmp3lame -b:a 48k -ac 1 "audio/$dir/$slug.mp3" </dev/null 2>/dev/null || true
    rm -f "$TMPD/x.aiff"; made=$((made+1))
  done < "$MAN"
  echo "  проход: сделано $made"
}
render_pass
render_pass
MISSING=$(while IFS=$'\t' read -r dir voice slug text; do
  [ -n "$slug" ] && [ ! -s "audio/$dir/$slug.mp3" ] && echo "$slug"; done < "$MAN" | wc -l | tr -d ' ')
echo "✔ Готово: $(ls audio/tr | wc -l | tr -d ' ') файлов · не хватает: $MISSING"
