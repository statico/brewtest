# brewtest

Guess-the-Homebrew-formula game. Static site; `npm run build` fetches
formulae.brew.sh and GitHub commit history (for "recently added" dates) into `public/`.

Deploy on Vercel as-is. Set `GITHUB_TOKEN` in the Vercel env to avoid rate-limit sleeps
during build (~2 min without). Add a deploy hook + cron if you want the data to refresh.
