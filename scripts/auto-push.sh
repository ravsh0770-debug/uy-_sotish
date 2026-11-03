#!/bin/bash
# Barcha o'zgarishlarni commit qilib, GitHub'ga push qiladi.
# O'zgarish bo'lmasa hech narsa qilmaydi.
cd "$(dirname "$0")/.." || exit 0

git add -A
if ! git diff --cached --quiet; then
  files=$(git diff --cached --name-only | head -5 | tr '\n' ' ')
  git commit -q -m "Avtomatik yangilanish: ${files}" || exit 0
fi

# Push qilinmagan commitlar bo'lsa — yuboramiz
if [ -n "$(git log origin/main..HEAD --oneline 2>/dev/null)" ] || ! git rev-parse -q --verify origin/main >/dev/null; then
  if GIT_TERMINAL_PROMPT=0 git push -q origin main 2>/tmp/auto-push-error.log; then
    echo '{"systemMessage": "GitHub: o'"'"'zgarishlar push qilindi ✓"}'
  else
    echo '{"systemMessage": "GitHub: push bo'"'"'lmadi — login kerak (git push ni terminalda bir marta ishga tushiring)"}'
  fi
fi
exit 0
