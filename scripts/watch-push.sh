#!/bin/bash
# Fayllarni o'zingiz tahrirlaganingizda ham avtomatik push qilish uchun.
# Ishga tushirish:  bash scripts/watch-push.sh     (to'xtatish: Ctrl+C)
# Har 30 soniyada o'zgarishlarni tekshiradi.
cd "$(dirname "$0")/.." || exit 1
echo "Kuzatuv boshlandi: har 30 soniyada o'zgarishlar GitHub'ga yuboriladi (Ctrl+C — to'xtatish)"
while true; do
  bash scripts/auto-push.sh >/dev/null && git log -1 --format="%h %s (%cr)" 2>/dev/null | sed 's/^/Oxirgi commit: /' | tr -d '\n'; echo -ne "\r"
  sleep 30
done
