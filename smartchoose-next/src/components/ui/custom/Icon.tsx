import React from 'react';
import {
  Phone, Mail, MapPin, Newspaper, ArrowRight, Star, CheckCircle, Check,
  ShoppingCart, Zap, FileX, ChevronRight, Clock, Package, Share2,
  ChevronUp, Search, X, Briefcase, Download, LayoutDashboard, Link,
  ArrowDown, ArrowLeft, Building2, Banknote, Calendar, Tag, Bookmark,
  Send, MessageCircle, Circle, AlertTriangle, AlertCircle, TrendingUp,
  PackageX, MousePointerClick, Info, HelpCircle, Activity, Globe,
  Shield, ShieldCheck, ShoppingBag, Target, Terminal, ThumbsUp, Trash2,
  Upload, UploadCloud, User, LogIn, LogOut, Edit, Edit2, Edit3,
  ExternalLink, Eye, ChevronDown, Plus, PlusCircle,
  Menu, Maximize2, Loader2, Save, SearchX, RefreshCw, Cpu, Heart, Lock,
  ChevronLeft, Bell, LayoutGrid, FileText, Home, Camera,
  Smartphone, Laptop, Sparkles, Gift, Clipboard
} from 'lucide-react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  fill?: string;
}

const iconNameMap: Record<string, React.ComponentType<{ size?: number; className?: string; fill?: string }>> = {
  'phone': Phone,
  'mail': Mail,
  'map-pin': MapPin,
  'newspaper': Newspaper,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'arrow-down': ArrowDown,
  'star': Star,
  'check-circle': CheckCircle,
  'check': Check,
  'shopping-cart': ShoppingCart,
  'zap': Zap,
  'file-x': FileX,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'clock': Clock,
  'package': Package,
  'share-2': Share2,
  'search': Search,
  'x': X,
  'briefcase': Briefcase,
  'download': Download,
  'layout-dashboard': LayoutDashboard,
  'link': Link,
  'building-2': Building2,
  'banknote': Banknote,
  'calendar': Calendar,
  'tag': Tag,
  'bookmark': Bookmark,
  'send': Send,
  'message-circle': MessageCircle,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'trending-up': TrendingUp,
  'package-x': PackageX,
  'mouse-pointer-click': MousePointerClick,
  'info': Info,
  'help-circle': HelpCircle,
  'activity': Activity,
  'globe': Globe,
  'shield': Shield,
  'shield-check': ShieldCheck,
  'shopping-bag': ShoppingBag,
  'target': Target,
  'terminal': Terminal,
  'thumbs-up': ThumbsUp,
  'trash-2': Trash2,
  'upload': Upload,
  'upload-cloud': UploadCloud,
  'user': User,
  'log-in': LogIn,
  'log-out': LogOut,
  'edit': Edit,
  'edit-2': Edit2,
  'edit-3': Edit3,
  'external-link': ExternalLink,
  'eye': Eye,
  'plus': Plus,
  'plus-circle': PlusCircle,
  'menu': Menu,
  'maximize-2': Maximize2,
  'loader-2': Loader2,
  'save': Save,
  'search-x': SearchX,
  'refresh-cw': RefreshCw,
  'cpu': Cpu,
  'heart': Heart,
  'lock': Lock,
  'bell': Bell,
  'layout-grid': LayoutGrid,
  'file-text': FileText,
  'home': Home,
  'instagram': Camera,
  'smartphone': Smartphone,
  'laptop': Laptop,
  'sparkles': Sparkles,
  'gift': Gift,
  'clipboard': Clipboard
};

export function Icon({ name, size = 24, className = '', fill = 'none' }: IconProps) {
  const IconComponent = iconNameMap[name] || Circle;
  return <IconComponent size={size} className={className} fill={fill} />;
}

export default Icon;
