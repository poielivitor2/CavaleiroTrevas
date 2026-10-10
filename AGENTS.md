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

## Game architecture
- Mount the first-person game client-only on the index route with React Three Fiber; browser rendering must never execute during SSR.
- Keep maze generation, collision, exit placement and line-of-sight in the shared dungeon module; visuals and rule tests must use the same world data.
- Bake torch illumination into static surface vertex colors with grid occlusion instead of runtime point lights; this prevents wall leaks without expensive shadow maps.
- Use fixed world-oriented pixel sprite planes for wall decorations and fallen warriors, and a single low-resolution palette render pass; preserve the retro style with a low GPU budget.
