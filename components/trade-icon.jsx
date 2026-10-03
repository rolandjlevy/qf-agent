import {
  Bath,
  BrickWall,
  Brush,
  Car,
  CookingPot,
  DoorOpen,
  Droplet,
  Fence,
  Flame,
  Grid2x2,
  Hammer,
  HardHat,
  House,
  Layers,
  PaintRoller,
  Shovel,
  Sprout,
  Toolbox,
  TreeDeciduous,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// One lucide icon per trade slug, shared by the homepage's trade chips and the "Quoting as" picker.
export const TRADE_ICONS = {
  // prettier-ignore
  'bathroom-fitter': Bath,
  'bricklayer': BrickWall,
  'builder': HardHat,
  'carpenter': Hammer,
  'driveway-specialist': Car,
  'electrician': Zap,
  'fencer': Fence,
  'flooring-fitter': Layers,
  'gas-engineer': Flame,
  'glazier': DoorOpen,
  'groundworker': Shovel,
  'handyman': Toolbox,
  'kitchen-fitter': CookingPot,
  'gardener-landscaper': Sprout,
  'decorator': PaintRoller,
  'plasterer': Brush,
  'plumber': Droplet,
  'roofer': House,
  'tiler': Grid2x2,
  'tree-surgeon': TreeDeciduous,
};

// Decorative: the trade's name always sits beside it. Renders nothing for a trade without an icon.
export default function TradeIcon({ trade, className }) {
  const Icon = TRADE_ICONS[trade];
  if (!Icon) return null;
  return (
    <Icon
      className={cn('size-4 shrink-0', className)}
      strokeWidth={1.75}
      aria-hidden="true"
    />
  );
}
