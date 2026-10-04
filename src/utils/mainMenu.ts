import type { MenuButtonId, MenuButtonPosition, Story } from "../types/story";
export const menuButtonIds: MenuButtonId[] = [
  "continue",
  "newStory",
  "loadGame",
  "settings",
];
export function menuPosition(
  story: Story,
  id: MenuButtonId,
): MenuButtonPosition {
  return (
    story.mainMenu?.buttons[id] ?? {
      column: 3,
      row: 1 + menuButtonIds.indexOf(id) * 3,
      width: 8,
      height: 2,
    }
  );
}
export function menuGridStyle(position: MenuButtonPosition) {
  return {
    gridColumn: `${position.column} / span ${position.width}`,
    gridRow: `${position.row} / span ${position.height}`,
  };
}
