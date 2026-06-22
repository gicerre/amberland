export type { AssetCategory, AssetFamily, AssetDefinition } from "./assets/registry";
export {
  getAsset,
  pickFromFamily,
  WINDOW_ASSETS,
  FRAME_SQUARE_ASSETS,
  FRAME_CIRCLE_ASSETS,
  CORNER_ASSETS,
  DIVIDER_ASSETS,
  BANNER_ASSETS,
  BUTTON_ASSETS,
  TAB_ASSETS,
  PROGRESS_BAR_ASSETS,
  CALLOUT_ASSETS,
  ARROW_ASSETS,
  SYMBOL_ASSETS,
  ICON_ASSETS,
} from "./assets/registry";

export type { MaterialFamily, TextureDefinition } from "./textures/registry";
export {
  getTexture,
  pickFromMaterial,
  WOOD_TEXTURES,
  METAL_TEXTURES,
  PARCHMENT_TEXTURES,
  STONE_TEXTURES,
  GLASS_TEXTURES,
} from "./textures/registry";

export type { AssetColor } from "./components/svg-asset";
export { frameImageStyle } from "./components/svg-asset";

export type { CategoryAssetProps } from "./components/assets";
export {
  WindowAsset,
  FrameAsset,
  CornerAsset,
  DividerAsset,
  BannerAsset,
  ButtonShellAsset,
  TabAsset,
  ProgressBarAsset,
  CalloutAsset,
  ArrowAsset,
  SymbolAsset,
  IconAsset,
} from "./components/assets";

export { WindowPanel } from "./components/window-panel";

export { FrameCard } from "./components/frame-card";

export { ImmersiveModal } from "./components/immersive-modal";
export type { ImmersiveModalProps } from "./components/immersive-modal";

export {
  FormConsole,
  ConsoleNav,
  ConsolePanel,
  ConsoleSectionHeading,
  ConsoleField,
  ConsoleSegmented,
} from "./components/form-console";
export type { ConsoleSection } from "./components/form-console";
