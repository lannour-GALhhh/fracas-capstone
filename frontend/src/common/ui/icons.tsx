import type { ComponentType, SVGProps } from 'react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  Activity01Icon,
  Add01Icon,
  Alert02Icon,
  AlertCircleIcon,
  Archive02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowRightDoubleIcon,
  ArrowUp01Icon,
  BankIcon,
  Calendar03Icon,
  Call02Icon,
  Camera01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  Chart01Icon,
  ChartIncreaseIcon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  Clock01Icon,
  CloudAngledRainIcon,
  CloudAngledRainZapIcon,
  CloudAngledZapIcon,
  CloudIcon,
  CrosshairIcon,
  Delete02Icon,
  FloppyDiskIcon,
  GridViewIcon,
  Home01Icon,
  HourglassIcon,
  Image01Icon,
  ImageAdd01Icon,
  InformationCircleIcon,
  Layers01Icon,
  Loading03Icon,
  Location01Icon,
  Location05Icon,
  Location06Icon,
  Logout01Icon,
  MapsIcon,
  MaximizeScreenIcon,
  Megaphone01Icon,
  MinusSignIcon,
  MoreHorizontalIcon as MoreHorizontalData,
  Navigation03Icon,
  Notification03Icon,
  PencilEdit02Icon,
  Radio01Icon,
  RefreshIcon,
  RotateLeft01Icon,
  Search01Icon,
  SecurityCheckIcon,
  Settings02Icon,
  SidebarLeftIcon,
  SidebarRightIcon,
  SirenIcon,
  SlidersHorizontalIcon,
  TaskAdd01Icon,
  TentIcon,
  TestTube01Icon,
  Tick02Icon,
  TornadoIcon,
  UnavailableIcon,
  Undo02Icon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
  WaveIcon,
} from '@hugeicons/core-free-icons'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string
  color?: string
  strokeWidth?: number
}
export type AppIcon = ComponentType<IconProps>

const make = (icon: IconSvgElement, displayName: string): AppIcon => {
  const Icon: AppIcon = ({ size = 24, ...props }) => (
    <HugeiconsIcon icon={icon} size={size} {...props} />
  )
  Icon.displayName = displayName
  return Icon
}

export const Activity = make(Activity01Icon, 'Activity')
export const AlertTriangle = make(Alert02Icon, 'AlertTriangle')
export const Archive = make(Archive02Icon, 'Archive')
export const ArrowLeft = make(ArrowLeft02Icon, 'ArrowLeft')
export const ArrowRight = make(ArrowRight02Icon, 'ArrowRight')
export const BadgeCheck = make(CheckmarkBadge01Icon, 'BadgeCheck')
export const BarChart3 = make(Chart01Icon, 'BarChart3')
export const BellRing = make(Notification03Icon, 'BellRing')
export const CalendarIcon = make(Calendar03Icon, 'CalendarIcon')
export const Camera = make(Camera01Icon, 'Camera')
export const Check = make(Tick02Icon, 'Check')
export const CheckCircle2 = make(CheckmarkCircle02Icon, 'CheckCircle2')
export const CheckIcon = make(Tick02Icon, 'CheckIcon')
export const ChevronDown = make(ArrowDown01Icon, 'ChevronDown')
export const ChevronDownIcon = make(ArrowDown01Icon, 'ChevronDownIcon')
export const ChevronLeft = make(ArrowLeft01Icon, 'ChevronLeft')
export const ChevronLeftIcon = make(ArrowLeft01Icon, 'ChevronLeftIcon')
export const ChevronRight = make(ArrowRight01Icon, 'ChevronRight')
export const ChevronRightIcon = make(ArrowRight01Icon, 'ChevronRightIcon')
export const ChevronUpIcon = make(ArrowUp01Icon, 'ChevronUpIcon')
export const ChevronsRight = make(ArrowRightDoubleIcon, 'ChevronsRight')
export const Circle = make(CircleIcon, 'Circle')
export const CircleAlert = make(AlertCircleIcon, 'CircleAlert')
export const CircleCheck = make(CheckmarkCircle02Icon, 'CircleCheck')
export const CircleCheckIcon = make(CheckmarkCircle02Icon, 'CircleCheckIcon')
export const CircleOff = make(UnavailableIcon, 'CircleOff')
export const ClipboardPlus = make(TaskAdd01Icon, 'ClipboardPlus')
export const Cloud = make(CloudIcon, 'Cloud')
export const CloudDrizzle = make(CloudAngledRainIcon, 'CloudDrizzle')
export const CloudLightning = make(CloudAngledZapIcon, 'CloudLightning')
export const CloudRain = make(CloudAngledRainIcon, 'CloudRain')
export const CloudRainWind = make(CloudAngledRainZapIcon, 'CloudRainWind')
export const Crosshair = make(CrosshairIcon, 'Crosshair')
export const Eye = make(ViewIcon, 'Eye')
export const EyeClosed = make(ViewOffIcon, 'EyeClosed')
export const FlaskConical = make(TestTube01Icon, 'FlaskConical')
export const History = make(Clock01Icon, 'History')
export const Home = make(Home01Icon, 'Home')
export const Hourglass = make(HourglassIcon, 'Hourglass')
export const ImageIcon = make(Image01Icon, 'ImageIcon')
export const ImagePlus = make(ImageAdd01Icon, 'ImagePlus')
export const InfoIcon = make(InformationCircleIcon, 'InfoIcon')
export const Landmark = make(BankIcon, 'Landmark')
export const Layers = make(Layers01Icon, 'Layers')
export const LayoutGrid = make(GridViewIcon, 'LayoutGrid')
export const Loader2 = make(Loading03Icon, 'Loader2')
export const Loader2Icon = make(Loading03Icon, 'Loader2Icon')
export const Locate = make(Location05Icon, 'Locate')
export const LogOut = make(Logout01Icon, 'LogOut')
export const Map = make(MapsIcon, 'Map')
export const MapPin = make(Location01Icon, 'MapPin')
export const MapPinned = make(Location06Icon, 'MapPinned')
export const Maximize = make(MaximizeScreenIcon, 'Maximize')
export const Megaphone = make(Megaphone01Icon, 'Megaphone')
export const Minus = make(MinusSignIcon, 'Minus')
export const MoreHorizontalIcon = make(MoreHorizontalData, 'MoreHorizontalIcon')
export const Navigation = make(Navigation03Icon, 'Navigation')
export const OctagonXIcon = make(CancelCircleIcon, 'OctagonXIcon')
export const PanelLeftIcon = make(SidebarLeftIcon, 'PanelLeftIcon')
export const PanelRightOpen = make(SidebarRightIcon, 'PanelRightOpen')
export const Pencil = make(PencilEdit02Icon, 'Pencil')
export const Phone = make(Call02Icon, 'Phone')
export const Plus = make(Add01Icon, 'Plus')
export const Radio = make(Radio01Icon, 'Radio')
export const RefreshCw = make(RefreshIcon, 'RefreshCw')
export const RotateCcw = make(RotateLeft01Icon, 'RotateCcw')
export const Save = make(FloppyDiskIcon, 'Save')
export const Search = make(Search01Icon, 'Search')
export const Settings = make(Settings02Icon, 'Settings')
export const ShieldCheck = make(SecurityCheckIcon, 'ShieldCheck')
export const Siren = make(SirenIcon, 'Siren')
export const SlidersHorizontal = make(SlidersHorizontalIcon, 'SlidersHorizontal')
export const Tent = make(TentIcon, 'Tent')
export const Tornado = make(TornadoIcon, 'Tornado')
export const Trash2 = make(Delete02Icon, 'Trash2')
export const TrendingUp = make(ChartIncreaseIcon, 'TrendingUp')
export const TriangleAlert = make(Alert02Icon, 'TriangleAlert')
export const TriangleAlertIcon = make(Alert02Icon, 'TriangleAlertIcon')
export const Undo2 = make(Undo02Icon, 'Undo2')
export const User = make(UserIcon, 'User')
export const UserRound = make(UserCircleIcon, 'UserRound')
export const Users = make(UserGroupIcon, 'Users')
export const Waves = make(WaveIcon, 'Waves')
export const X = make(Cancel01Icon, 'X')
export const XIcon = make(Cancel01Icon, 'XIcon')
