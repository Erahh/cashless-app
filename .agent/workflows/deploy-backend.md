---
description: How to deploy backend changes to Render
---

1. Open your terminal in the `cashless-backend` folder.
2. Check your git status:
   `git status`
3. Stage the modified files:
   `git add .`
4. Commit the changes:
   `git commit -m "Fix user_pins column name mismatch (user_id to commuter_id)"`
5. Push to GitHub:
   `git push origin main`
6. Go to your [Render Dashboard](https://dashboard.render.com/) and wait for the deployment to finish.
7. Once deployed, the MPIN error should be resolved.
