<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Normalize auth-session metadata at the AuthProvider boundary so missing account metadata cannot crash preference consumers.
- Global search normalizes cache keys, merges owned titles before remote results, and enables only providers relevant to the selected mode; the camera scanner loads only when opened.
- Multilingual fragment archives share one manifest request per load while retaining independent language fallbacks.
