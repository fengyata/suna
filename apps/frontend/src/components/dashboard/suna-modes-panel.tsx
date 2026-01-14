'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Image as ImageIcon,
  Presentation,
  BarChart3,
  ArrowUpRight,
  FileText,
  Search,
  Palette,
  Video,
  RefreshCw,
  Check,
  Table,
  LayoutDashboard,
  FileBarChart,
  X,
  Eye,
  Lock,
  Sparkles,
  Pencil,
  Maximize2,
  Scissors,
  Camera,
  Droplets,
  Monitor,
  Brush,
  Minimize2,
  Box,
  Clock,
  BookOpen,
  Zap,
  Sun,
  Hexagon,
  Shapes,
  Flower2,
  Mountain,
  Layers,
  FileCode,
  Lightbulb,
  ScrollText,
  BookMarked,
  Scale,
  Users,
  Clapperboard,
  Package,
  Play,
  Leaf,
  Wand2,
  Compass,
  PieChart,
  TrendingUp,
  CircleDot,
  Grid3X3,
  Flame,
  Circle,
  Cloud,
  BarChart2,
  AreaChart,
  type LucideIcon,
} from 'lucide-react';
import { KortixLoader } from '@/components/ui/kortix-loader';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getPdfUrl } from '@/components/thread/tool-views/utils/presentation-utils';
import { useTranslations } from 'next-intl';
import { PromptExamples } from '@/components/shared/prompt-examples';
import { sunaModes, type SunaModeId, type SunaSamplePrompt } from './suna-modes-data';

interface SunaModesPanelProps {
  selectedMode: string | null;
  onModeSelect: (mode: string | null) => void;
  onSelectPrompt: (prompt: string) => void;
  isMobile?: boolean;
  selectedCharts?: string[];
  onChartsChange?: (charts: string[]) => void;
  selectedOutputFormat?: string | null;
  onOutputFormatChange?: (format: string | null) => void;
  selectedTemplate?: string | null;
  onTemplateChange?: (template: string | null) => void;
  isFreeTier?: boolean;
  onUpgradeClick?: () => void;
}

type ModeType = 'image' | 'slides' | 'data' | 'docs' | 'canvas' | 'video' | 'research';

type SamplePrompt = SunaSamplePrompt;
type Mode = (typeof sunaModes)[number];
const modes = sunaModes as unknown as Mode[];

const modeIconById: Record<SunaModeId, React.ReactNode> = {
  slides: <Presentation className="w-4 h-4" strokeWidth={2} />,
  data: <BarChart3 className="w-4 h-4" strokeWidth={2} />,
  docs: <FileText className="w-4 h-4" strokeWidth={2} />,
  canvas: <Palette className="w-4 h-4" strokeWidth={2} />,
  video: <Video className="w-4 h-4" strokeWidth={2} />,
  research: <Search className="w-4 h-4" strokeWidth={2} />,
  image: <ImageIcon className="w-4 h-4" strokeWidth={2} />,
};

// Unified icon getter for all mode options
const getOptionIcon = (iconType: string, className: string = "w-5 h-5") => {
  const iconMap: Record<string, React.ReactNode> = {
    // Image styles
    camera: <Camera className={className} />,
    droplets: <Droplets className={className} />,
    monitor: <Monitor className={className} />,
    brush: <Brush className={className} />,
    minimize: <Minimize2 className={className} />,
    box: <Box className={className} />,
    clock: <Clock className={className} />,
    zap: <Zap className={className} />,
    sun: <Sun className={className} />,
    flower: <Flower2 className={className} />,
    hexagon: <Hexagon className={className} />,
    shapes: <Shapes className={className} />,
    sparkles: <Sparkles className={className} />,
    mountain: <Mountain className={className} />,
    layers: <Layers className={className} />,
    // Docs templates
    fileText: <FileText className={className} />,
    fileCode: <FileCode className={className} />,
    lightbulb: <Lightbulb className={className} />,
    fileBarChart: <FileBarChart className={className} />,
    bookOpen: <BookOpen className={className} />,
    bookMarked: <BookMarked className={className} />,
    scale: <Scale className={className} />,
    users: <Users className={className} />,
    // Slides templates
    palette: <Palette className={className} />,
    circle: <Circle className={className} />,
    leaf: <Leaf className={className} />,
    barChart: <BarChart3 className={className} />,
    pieChart: <PieChart className={className} />,
    trendingUp: <TrendingUp className={className} />,
    // Video styles
    clapperboard: <Clapperboard className={className} />,
    package: <Package className={className} />,
    play: <Play className={className} />,
    compass: <Compass className={className} />,
    // Data output formats
    table: <Table className={className} />,
    dashboard: <LayoutDashboard className={className} />,
    report: <FileBarChart className={className} />,
    presentation: <Presentation className={className} />,
    // Canvas actions
    pencil: <Pencil className={className} />,
    maximize: <Maximize2 className={className} />,
    scissors: <Scissors className={className} />,
    // Chart types
    circleDot: <CircleDot className={className} />,
    grid: <Grid3X3 className={className} />,
    cloud: <Cloud className={className} />,
    areaChart: <AreaChart className={className} />,
  };
  
  return iconMap[iconType] || <Palette className={className} />;
};

// Helper function to get random prompts
const getRandomPrompts = (prompts: SamplePrompt[], count: number): SamplePrompt[] => {
  const shuffled = [...prompts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Output format icon component
const OutputFormatIcon = ({ type, className }: { type: string; className?: string }) => {
  const baseClasses = cn('w-full h-full', className);
  
  switch (type) {
    case 'spreadsheet':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          {/* Table background */}
          <rect x="10" y="20" width="80" height="60" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="4"/>
          
          {/* Header row background */}
          <rect x="10" y="20" width="80" height="12" fill="currentColor" opacity="0.15" rx="4" />
          
          {/* Grid lines - horizontal */}
          <line x1="10" y1="32" x2="90" y2="32" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
          <line x1="10" y1="44" x2="90" y2="44" stroke="currentColor" strokeWidth="1" opacity="0.25"/>
          <line x1="10" y1="56" x2="90" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.25"/>
          <line x1="10" y1="68" x2="90" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.25"/>
          
          {/* Grid lines - vertical */}
          <line x1="30" y1="20" x2="30" y2="80" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
          <line x1="50" y1="20" x2="50" y2="80" stroke="currentColor" strokeWidth="1" opacity="0.25"/>
          <line x1="70" y1="20" x2="70" y2="80" stroke="currentColor" strokeWidth="1" opacity="0.25"/>
          
          {/* Data cells */}
          <rect x="14" y="24" width="12" height="5" fill="currentColor" opacity="0.7" rx="1"/>
          <rect x="34" y="36" width="12" height="5" fill="currentColor" opacity="0.5" rx="1"/>
          <rect x="54" y="48" width="12" height="5" fill="currentColor" opacity="0.4" rx="1"/>
          <rect x="74" y="60" width="12" height="5" fill="currentColor" opacity="0.5" rx="1"/>
          <rect x="14" y="48" width="12" height="5" fill="currentColor" opacity="0.4" rx="1"/>
          <rect x="34" y="60" width="12" height="5" fill="currentColor" opacity="0.5" rx="1"/>
          
          {/* Formula bar */}
          <rect x="10" y="10" width="80" height="7" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2" rx="2"/>
          <text x="13" y="15" fontSize="6" opacity="0.4">fx</text>
          <rect x="22" y="12" width="30" height="3" fill="currentColor" opacity="0.3" rx="0.5"/>
        </svg>
      );
    
    case 'dashboard':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          {/* Top left widget - KPI */}
          <rect x="10" y="15" width="35" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" rx="4"/>
          <rect x="10" y="15" width="35" height="8" fill="currentColor" opacity="0.1" rx="4"/>
          <circle cx="17" cy="19" r="2" fill="currentColor" opacity="0.6"/>
          <rect x="22" y="17.5" width="18" height="3" fill="currentColor" opacity="0.4" rx="1"/>
          <text x="15" y="36" fontSize="12" opacity="0.7" fontWeight="600">42K</text>
          
          {/* Top right widget - Line chart */}
          <rect x="52" y="15" width="38" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" rx="4"/>
          <path d="M 58,35 L 65,30 L 72,32 L 79,28 L 84,31" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round"/>
          <circle cx="58" cy="35" r="1.5" fill="currentColor" opacity="0.7"/>
          <circle cx="65" cy="30" r="1.5" fill="currentColor" opacity="0.7"/>
          <circle cx="72" cy="32" r="1.5" fill="currentColor" opacity="0.7"/>
          <circle cx="79" cy="28" r="1.5" fill="currentColor" opacity="0.7"/>
          <circle cx="84" cy="31" r="1.5" fill="currentColor" opacity="0.7"/>
          
          {/* Bottom widget - Bar chart */}
          <rect x="10" y="50" width="80" height="35" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" rx="4"/>
          <rect x="18" y="65" width="8" height="15" fill="currentColor" opacity="0.5" rx="1"/>
          <rect x="32" y="60" width="8" height="20" fill="currentColor" opacity="0.6" rx="1"/>
          <rect x="46" y="62" width="8" height="18" fill="currentColor" opacity="0.5" rx="1"/>
          <rect x="60" y="55" width="8" height="25" fill="currentColor" opacity="0.7" rx="1"/>
          <rect x="74" y="58" width="8" height="22" fill="currentColor" opacity="0.6" rx="1"/>
          <line x1="10" y1="80" x2="90" y2="80" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
        </svg>
      );
    
    case 'report':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          {/* Document */}
          <rect x="20" y="10" width="60" height="80" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="3"/>
          
          {/* Page fold effect */}
          <path d="M 70,10 L 80,20 L 80,10 Z" fill="currentColor" opacity="0.1"/>
          
          {/* Title */}
          <rect x="28" y="20" width="44" height="5" fill="currentColor" opacity="0.8" rx="1"/>
          
          {/* Subtitle */}
          <rect x="28" y="28" width="30" height="3" fill="currentColor" opacity="0.4" rx="0.5"/>
          
          {/* Paragraph lines */}
          <rect x="28" y="36" width="44" height="2" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="28" y="40" width="40" height="2" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="28" y="44" width="42" height="2" fill="currentColor" opacity="0.3" rx="0.5"/>
          
          {/* Chart section */}
          <rect x="28" y="52" width="44" height="22" fill="currentColor" opacity="0.05" rx="2"/>
          <rect x="34" y="64" width="6" height="8" fill="currentColor" opacity="0.6" rx="0.5"/>
          <rect x="42" y="60" width="6" height="12" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="50" y="62" width="6" height="10" fill="currentColor" opacity="0.6" rx="0.5"/>
          <rect x="58" y="58" width="6" height="14" fill="currentColor" opacity="0.8" rx="0.5"/>
          <line x1="28" y1="72" x2="72" y2="72" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
          
          {/* More text */}
          <rect x="28" y="78" width="38" height="2" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="28" y="82" width="44" height="2" fill="currentColor" opacity="0.3" rx="0.5"/>
        </svg>
      );
    
    case 'slides':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          {/* Main slide */}
          <rect x="15" y="20" width="70" height="52" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" rx="3"/>
          
          {/* Title area */}
          <rect x="22" y="28" width="35" height="5" fill="currentColor" opacity="0.8" rx="1"/>
          
          {/* Subtitle */}
          <rect x="22" y="36" width="25" height="3" fill="currentColor" opacity="0.5" rx="0.5"/>
          
          {/* Content bullets */}
          <circle cx="24" cy="46" r="1" fill="currentColor" opacity="0.6"/>
          <rect x="28" y="45" width="20" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          
          <circle cx="24" cy="52" r="1" fill="currentColor" opacity="0.6"/>
          <rect x="28" y="51" width="18" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          
          <circle cx="24" cy="58" r="1" fill="currentColor" opacity="0.6"/>
          <rect x="28" y="57" width="22" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          
          {/* Image placeholder */}
          <rect x="58" y="44" width="20" height="20" fill="currentColor" opacity="0.1" rx="2"/>
          <circle cx="68" cy="54" r="6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
          <path d="M 60,60 L 65,55 L 70,58 L 76,52" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4"/>
          
          {/* Slide indicators */}
          <rect x="20" y="78" width="10" height="6" fill="currentColor" opacity="0.3" rx="1"/>
          <rect x="35" y="78" width="10" height="6" fill="currentColor" opacity="0.7" rx="1"/>
          <rect x="50" y="78" width="10" height="6" fill="currentColor" opacity="0.3" rx="1"/>
          <rect x="65" y="78" width="10" height="6" fill="currentColor" opacity="0.3" rx="1"/>
        </svg>
      );
    
    default:
      return <Table className="w-6 h-6" />;
  }
};

// Slide template icon component
const SlideTemplateIcon = ({ type, className }: { type: string; className?: string }) => {
  const baseClasses = cn('w-full h-full text-foreground', className);
  
  switch (type) {
    case 'modern':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="15" y="20" width="70" height="50" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="3"/>
          <rect x="20" y="28" width="30" height="4" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="20" y="36" width="20" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          <line x1="20" y1="44" x2="38" y2="44" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
          <rect x="20" y="48" width="25" height="2" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="20" y="52" width="22" height="2" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="55" y="28" width="25" height="25" fill="currentColor" opacity="0.15" rx="2"/>
          <circle cx="67.5" cy="40.5" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
          <rect x="25" y="75" width="50" height="3" fill="currentColor" opacity="0.2" rx="1"/>
        </svg>
      );
    
    case 'bold':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="10" y="15" width="80" height="55" fill="currentColor" opacity="0.15" rx="4"/>
          <rect x="15" y="22" width="35" height="8" fill="currentColor" opacity="0.9" rx="2"/>
          <rect x="15" y="35" width="28" height="4" fill="currentColor" opacity="0.7" rx="1"/>
          <rect x="15" y="43" width="32" height="4" fill="currentColor" opacity="0.7" rx="1"/>
          <rect x="15" y="51" width="30" height="4" fill="currentColor" opacity="0.7" rx="1"/>
          <rect x="55" y="22" width="30" height="18" fill="currentColor" opacity="0.8" rx="2"/>
          <circle cx="70" cy="31" r="5" fill="var(--background)" opacity="0.9"/>
          <rect x="10" y="75" width="80" height="8" fill="currentColor" opacity="0.9" rx="2"/>
        </svg>
      );
    
    case 'elegant':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <line x1="30" y1="25" x2="70" y2="25" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
          <rect x="35" y="32" width="30" height="5" fill="currentColor" opacity="0.7" rx="1"/>
          <rect x="40" y="42" width="20" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          <circle cx="50" cy="55" r="1" fill="currentColor" opacity="0.5"/>
          <rect x="30" y="60" width="40" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="32" y="64" width="36" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="34" y="68" width="32" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <line x1="30" y1="78" x2="70" y2="78" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
          <path d="M 48,25 L 50,20 L 52,25" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.4"/>
        </svg>
      );
    
    case 'tech':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="15" y="20" width="70" height="50" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" rx="2"/>
          <path d="M 15,30 L 85,30" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
          <circle cx="20" cy="25" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="26" cy="25" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="32" cy="25" r="1.5" fill="currentColor" opacity="0.6"/>
          <rect x="20" y="36" width="25" height="3" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="20" y="42" width="18" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          <path d="M 55,38 L 60,43 L 55,48" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6"/>
          <path d="M 65,38 L 75,38 L 75,58 L 65,58" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/>
          <rect x="20" y="52" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <path d="M 20,58 L 32,58 M 26,52 L 26,64" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
        </svg>
      );
    
    case 'creative':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <path d="M 20,25 Q 25,20 35,25 L 40,35 Q 30,30 20,35 Z" opacity="0.6"/>
          <circle cx="70" cy="30" r="8" opacity="0.5"/>
          <path d="M 15,45 L 45,45 L 42,55 L 18,55 Z" opacity="0.7"/>
          <rect x="50" y="48" width="35" height="2" fill="currentColor" opacity="0.4" rx="1" transform="rotate(-5 67.5 49)"/>
          <rect x="50" y="54" width="30" height="2" fill="currentColor" opacity="0.4" rx="1" transform="rotate(3 65 55)"/>
          <circle cx="25" cy="68" r="3" opacity="0.6"/>
          <circle cx="40" cy="65" r="5" opacity="0.5"/>
          <circle cx="60" cy="70" r="4" opacity="0.7"/>
          <path d="M 70,65 L 80,70 L 75,75 Z" opacity="0.6"/>
        </svg>
      );
    
    case 'minimal':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="30" y="35" width="40" height="3" fill="currentColor" opacity="0.8" rx="0.5"/>
          <rect x="35" y="45" width="30" height="1.5" fill="currentColor" opacity="0.4" rx="0.5"/>
          <rect x="35" y="50" width="30" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="35" y="55" width="30" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <circle cx="50" cy="68" r="1.5" fill="currentColor" opacity="0.5"/>
        </svg>
      );
    
    case 'corporate':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="10" y="15" width="80" height="60" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="2"/>
          <rect x="10" y="15" width="80" height="12" fill="currentColor" opacity="0.15"/>
          <rect x="18" y="35" width="30" height="4" fill="currentColor" opacity="0.7" rx="1"/>
          <rect x="18" y="42" width="25" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          <rect x="18" y="47" width="28" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          <rect x="18" y="52" width="26" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          <rect x="55" y="35" width="28" height="20" fill="currentColor" opacity="0.2" rx="2"/>
          <rect x="60" y="45" width="5" height="8" fill="currentColor" opacity="0.6" rx="0.5"/>
          <rect x="68" y="42" width="5" height="11" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="76" y="40" width="5" height="13" fill="currentColor" opacity="0.8" rx="0.5"/>
          <rect x="35" y="80" width="30" height="3" fill="currentColor" opacity="0.5" rx="1"/>
        </svg>
      );
    
    case 'vibrant':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="15" y="20" width="70" height="50" fill="currentColor" opacity="0.12" rx="4"/>
          <circle cx="30" cy="35" r="8" fill="currentColor" opacity="0.7"/>
          <circle cx="50" cy="32" r="10" fill="currentColor" opacity="0.8"/>
          <circle cx="70" cy="36" r="7" fill="currentColor" opacity="0.6"/>
          <rect x="20" y="50" width="15" height="3" fill="currentColor" opacity="0.9" rx="1"/>
          <rect x="40" y="50" width="20" height="3" fill="currentColor" opacity="0.85" rx="1"/>
          <rect x="65" y="50" width="12" height="3" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="22" y="58" width="10" height="2" fill="currentColor" opacity="0.5" rx="0.5"/>
          <rect x="42" y="58" width="15" height="2" fill="currentColor" opacity="0.5" rx="0.5"/>
          <rect x="67" y="58" width="8" height="2" fill="currentColor" opacity="0.5" rx="0.5"/>
        </svg>
      );
    
    case 'startup':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <path d="M 50,25 L 55,35 L 45,35 Z" opacity="0.8"/>
          <rect x="48" y="35" width="4" height="15" opacity="0.7"/>
          <circle cx="35" cy="55" r="3" opacity="0.4"/>
          <circle cx="50" cy="50" r="5" opacity="0.6"/>
          <circle cx="65" cy="55" r="3" opacity="0.4"/>
          <path d="M 30,60 Q 50,50 70,60" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
          <rect x="32" y="65" width="36" height="2" fill="currentColor" opacity="0.6" rx="1"/>
          <rect x="35" y="70" width="30" height="2" fill="currentColor" opacity="0.4" rx="1"/>
          <circle cx="25" cy="40" r="1.5" opacity="0.3"/>
          <circle cx="75" cy="42" r="1.5" opacity="0.3"/>
          <circle cx="28" cy="32" r="1" opacity="0.25"/>
        </svg>
      );
    
    case 'professional':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="20" y="22" width="60" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" rx="2"/>
          <rect x="25" y="28" width="25" height="4" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="25" y="36" width="20" height="2" fill="currentColor" opacity="0.5" rx="0.5"/>
          <rect x="25" y="40" width="22" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          <rect x="25" y="44" width="18" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          <line x1="25" y1="52" x2="75" y2="52" stroke="currentColor" strokeWidth="1" opacity="0.25"/>
          <rect x="25" y="56" width="15" height="2" fill="currentColor" opacity="0.5" rx="0.5"/>
          <rect x="25" y="60" width="18" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          <rect x="55" y="28" width="20" height="15" fill="currentColor" opacity="0.2" rx="1"/>
          <rect x="60" y="56" width="8" height="10" fill="currentColor" opacity="0.6" rx="0.5"/>
          <rect x="70" y="60" width="8" height="6" fill="currentColor" opacity="0.5" rx="0.5"/>
        </svg>
      );
    
    case 'dark':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="15" y="20" width="70" height="50" fill="currentColor" opacity="0.9" rx="3"/>
          <rect x="20" y="26" width="25" height="4" fill="var(--background)" opacity="0.8" rx="1"/>
          <rect x="20" y="34" width="18" height="2" fill="var(--background)" opacity="0.5" rx="0.5"/>
          <rect x="20" y="38" width="20" height="2" fill="var(--background)" opacity="0.4" rx="0.5"/>
          <rect x="20" y="42" width="16" height="2" fill="var(--background)" opacity="0.4" rx="0.5"/>
          <circle cx="65" cy="38" r="10" fill="var(--background)" opacity="0.3"/>
          <circle cx="65" cy="38" r="6" fill="currentColor" opacity="0.9"/>
          <rect x="20" y="55" width="60" height="10" fill="var(--background)" opacity="0.2" rx="1"/>
        </svg>
      );
    
    case 'playful':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <circle cx="30" cy="30" r="8" opacity="0.7"/>
          <rect x="45" y="25" width="30" height="4" opacity="0.8" rx="2" transform="rotate(-3 60 27)"/>
          <rect x="48" y="33" width="25" height="2" opacity="0.5" rx="1" transform="rotate(2 60.5 34)"/>
          <path d="M 20,45 Q 25,50 30,45 T 40,45" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6"/>
          <circle cx="55" cy="48" r="4" opacity="0.6"/>
          <circle cx="68" cy="46" r="5" opacity="0.7"/>
          <path d="M 20,60 L 35,58 L 33,68 L 22,65 Z" opacity="0.65"/>
          <rect x="45" y="60" width="20" height="3" opacity="0.6" rx="1.5" transform="rotate(-2 55 61.5)"/>
          <rect x="48" y="67" width="15" height="2" opacity="0.5" rx="1" transform="rotate(3 55.5 68)"/>
          <circle cx="75" cy="65" r="3" opacity="0.5"/>
        </svg>
      );
    
    case 'sophisticated':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="25" y="25" width="50" height="40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" rx="1"/>
          <line x1="25" y1="35" x2="75" y2="35" stroke="currentColor" strokeWidth="0.5" opacity="0.25"/>
          <circle cx="30" cy="30" r="2" opacity="0.6"/>
          <rect x="35" y="29" width="15" height="2" fill="currentColor" opacity="0.5" rx="0.5"/>
          <line x1="28" y1="40" x2="72" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
          <line x1="28" y1="45" x2="72" y2="45" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
          <line x1="28" y1="50" x2="72" y2="50" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
          <line x1="28" y1="55" x2="72" y2="55" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
          <rect x="52" y="42" width="18" height="18" fill="currentColor" opacity="0.15" rx="1"/>
          <path d="M 30,70 L 35,75 L 40,70" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4"/>
          <path d="M 60,70 L 65,75 L 70,70" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4"/>
        </svg>
      );
    
    case 'gradient':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'currentColor', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: 'currentColor', stopOpacity: 0.3 }} />
            </linearGradient>
          </defs>
          <rect x="15" y="20" width="70" height="50" fill="url(#grad1)" rx="3"/>
          <rect x="22" y="28" width="28" height="5" fill="var(--background)" opacity="0.9" rx="1"/>
          <rect x="22" y="37" width="20" height="2" fill="var(--background)" opacity="0.6" rx="0.5"/>
          <rect x="22" y="42" width="22" height="2" fill="var(--background)" opacity="0.5" rx="0.5"/>
          <circle cx="65" cy="40" r="12" fill="var(--background)" opacity="0.4"/>
          <rect x="22" y="55" width="56" height="8" fill="var(--background)" opacity="0.3" rx="1"/>
        </svg>
      );
    
    case 'monochrome':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="20" y="25" width="60" height="45" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.8" rx="1"/>
          <rect x="25" y="32" width="25" height="5" fill="currentColor" opacity="0.9" rx="0.5"/>
          <rect x="25" y="40" width="20" height="2" fill="currentColor" opacity="0.6" rx="0.5"/>
          <rect x="25" y="44" width="22" height="2" fill="currentColor" opacity="0.5" rx="0.5"/>
          <rect x="25" y="48" width="18" height="2" fill="currentColor" opacity="0.5" rx="0.5"/>
          <rect x="55" y="32" width="20" height="20" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="60" y="37" width="10" height="10" fill="var(--background)" opacity="0.9"/>
          <rect x="25" y="58" width="50" height="8" fill="currentColor" opacity="0.3" rx="0.5"/>
        </svg>
      );
    
    case 'futuristic':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <path d="M 20,25 L 80,25 L 75,65 L 25,65 Z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
          <path d="M 25,30 L 75,30" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
          <rect x="28" y="35" width="20" height="3" fill="currentColor" opacity="0.8" rx="0.5" transform="skewX(-5)"/>
          <rect x="28" y="42" width="15" height="2" fill="currentColor" opacity="0.5" rx="0.5" transform="skewX(-5)"/>
          <path d="M 55,38 L 68,38 L 66,48 L 53,48 Z" fill="currentColor" opacity="0.6"/>
          <circle cx="60" cy="43" r="3" fill="var(--background)" opacity="0.8"/>
          <path d="M 28,52 L 50,52 M 32,56 L 48,56" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
          <circle cx="30" cy="38" r="1.5" fill="currentColor" opacity="0.7"/>
          <circle cx="70" cy="52" r="1.5" fill="currentColor" opacity="0.6"/>
          <path d="M 30,72 L 35,68 L 40,72 L 35,76 Z" fill="currentColor" opacity="0.5"/>
          <path d="M 60,72 L 65,68 L 70,72 L 65,76 Z" fill="currentColor" opacity="0.5"/>
        </svg>
      );
    
    default:
      return <Presentation className="w-6 h-6" />;
  }
};

// Docs template icon component
const DocsTemplateIcon = ({ type, className }: { type: string; className?: string }) => {
  const baseClasses = cn('w-full h-full', className);
  
  switch (type) {
    case 'prd':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="20" y="15" width="60" height="70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="3"/>
          <rect x="25" y="22" width="30" height="5" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="25" y="30" width="20" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          
          <rect x="25" y="38" width="15" height="3" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="25" y="44" width="48" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="48" width="45" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          
          <rect x="25" y="55" width="18" height="3" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="28" y="60" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <path d="M 29,61 L 30,62.5 L 31.5,60.5" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.7"/>
          <rect x="33" y="61" width="20" height="1.5" fill="currentColor" opacity="0.4" rx="0.5"/>
          <rect x="28" y="65" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <rect x="33" y="66" width="18" height="1.5" fill="currentColor" opacity="0.4" rx="0.5"/>
          
          <rect x="25" y="73" width="15" height="3" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="25" y="78" width="30" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
        </svg>
      );
    
    case 'technical':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="20" y="15" width="60" height="70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="3"/>
          <rect x="25" y="22" width="25" height="4" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="25" y="29" width="18" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          
          <rect x="25" y="37" width="48" height="15" fill="currentColor" opacity="0.1" rx="2"/>
          <text x="28" y="44" fontSize="6" opacity="0.5" fontFamily="monospace">{'<code>'}</text>
          <rect x="30" y="46" width="20" height="1" fill="currentColor" opacity="0.4" rx="0.3"/>
          <rect x="32" y="49" width="18" height="1" fill="currentColor" opacity="0.4" rx="0.3"/>
          
          <rect x="25" y="57" width="15" height="2.5" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="25" y="62" width="48" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="66" width="45" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="70" width="40" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          
          <circle cx="72" cy="25" r="3" fill="currentColor" opacity="0.6"/>
          <path d="M 70,25 L 71,26 L 74,23" stroke="var(--background)" strokeWidth="1" fill="none"/>
        </svg>
      );
    
    case 'proposal':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="20" y="15" width="60" height="70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="3"/>
          
          <circle cx="50" cy="28" r="6" fill="currentColor" opacity="0.6"/>
          <path d="M 50,34 L 50,40" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
          <path d="M 50,40 L 46,45 M 50,40 L 54,45" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
          
          <rect x="30" y="50" width="40" height="3" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="32" y="56" width="36" height="2" fill="currentColor" opacity="0.5" rx="0.5"/>
          
          <rect x="25" y="63" width="22" height="15" fill="currentColor" opacity="0.15" rx="2"/>
          <rect x="29" y="68" width="5" height="6" fill="currentColor" opacity="0.6" rx="0.5"/>
          <rect x="36" y="70" width="5" height="4" fill="currentColor" opacity="0.5" rx="0.5"/>
          
          <rect x="52" y="63" width="22" height="15" fill="currentColor" opacity="0.15" rx="2"/>
          <circle cx="63" cy="70" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6"/>
          <path d="M 66,73 L 69,76" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
        </svg>
      );
    
    case 'report':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="20" y="15" width="60" height="70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="3"/>
          <rect x="25" y="22" width="35" height="4" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="25" y="29" width="25" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          
          <line x1="25" y1="37" x2="75" y2="37" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
          
          <rect x="25" y="42" width="48" height="18" fill="currentColor" opacity="0.08" rx="2"/>
          <rect x="30" y="52" width="5" height="6" fill="currentColor" opacity="0.6" rx="0.5"/>
          <rect x="37" y="50" width="5" height="8" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="44" y="48" width="5" height="10" fill="currentColor" opacity="0.8" rx="0.5"/>
          <rect x="51" y="50" width="5" height="8" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="58" y="53" width="5" height="5" fill="currentColor" opacity="0.6" rx="0.5"/>
          <line x1="25" y1="58" x2="73" y2="58" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
          
          <rect x="25" y="66" width="48" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="70" width="45" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="74" width="40" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="78" width="43" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
        </svg>
      );
    
    case 'guide':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="20" y="15" width="60" height="70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="3"/>
          <rect x="25" y="22" width="28" height="4" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="25" y="29" width="20" height="2" fill="currentColor" opacity="0.4" rx="0.5"/>
          
          <circle cx="30" cy="41" r="4" fill="currentColor" opacity="0.7"/>
          <text x="28" y="44" fontSize="6" fill="var(--background)" fontWeight="bold">1</text>
          <rect x="37" y="38" width="15" height="2.5" fill="currentColor" opacity="0.6" rx="0.5"/>
          <rect x="37" y="42" width="30" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          
          <circle cx="30" cy="53" r="4" fill="currentColor" opacity="0.7"/>
          <text x="28" y="56" fontSize="6" fill="var(--background)" fontWeight="bold">2</text>
          <rect x="37" y="50" width="18" height="2.5" fill="currentColor" opacity="0.6" rx="0.5"/>
          <rect x="37" y="54" width="32" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          
          <circle cx="30" cy="65" r="4" fill="currentColor" opacity="0.7"/>
          <text x="28" y="68" fontSize="6" fill="var(--background)" fontWeight="bold">3</text>
          <rect x="37" y="62" width="16" height="2.5" fill="currentColor" opacity="0.6" rx="0.5"/>
          <rect x="37" y="66" width="28" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          
          <circle cx="30" cy="77" r="4" fill="currentColor" opacity="0.7"/>
          <text x="28" y="80" fontSize="6" fill="var(--background)" fontWeight="bold">4</text>
          <rect x="37" y="74" width="20" height="2.5" fill="currentColor" opacity="0.6" rx="0.5"/>
        </svg>
      );
    
    case 'wiki':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="20" y="15" width="60" height="70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="3"/>
          
          <path d="M 30,23 L 35,32 L 40,23 L 45,32 L 50,23" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round"/>
          
          <rect x="25" y="38" width="25" height="3" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="25" y="44" width="48" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="48" width="45" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="52" width="40" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          
          <rect x="25" y="59" width="20" height="3" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="25" y="65" width="35" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="69" width="38" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          
          <rect x="55" y="38" width="18" height="14" fill="currentColor" opacity="0.12" rx="2"/>
          <circle cx="64" cy="45" r="3" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5"/>
          <path d="M 57,49 L 60,46 L 64,48 L 71,43" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5"/>
          
          <path d="M 30,78 L 35,75 L 40,78" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round"/>
          <path d="M 45,78 L 50,75 L 55,78" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round"/>
        </svg>
      );
    
    case 'policy':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="20" y="15" width="60" height="70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="3"/>
          
          <path d="M 48,20 L 50,25 L 52,20" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4"/>
          <circle cx="50" cy="30" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6"/>
          <path d="M 50,35 L 50,38" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <circle cx="50" cy="39" r="1" fill="currentColor" opacity="0.6"/>
          
          <rect x="30" y="45" width="40" height="3" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="32" y="51" width="36" height="2" fill="currentColor" opacity="0.5" rx="0.5"/>
          
          <line x1="28" y1="58" x2="72" y2="58" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
          
          <rect x="25" y="62" width="48" height="1.5" fill="currentColor" opacity="0.4" rx="0.5"/>
          <rect x="25" y="66" width="45" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="70" width="48" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="74" width="40" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="78" width="45" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          
          <rect x="60" y="80" width="15" height="3" fill="currentColor" opacity="0.15" rx="1"/>
          <text x="62" y="83" fontSize="5" opacity="0.5">Sign</text>
        </svg>
      );
    
    case 'meeting-notes':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="20" y="15" width="60" height="70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" rx="3"/>
          
          <circle cx="28" cy="23" r="2" fill="currentColor" opacity="0.6"/>
          <circle cx="35" cy="23" r="2" fill="currentColor" opacity="0.6"/>
          <circle cx="42" cy="23" r="2" fill="currentColor" opacity="0.6"/>
          
          <rect x="25" y="30" width="30" height="3.5" fill="currentColor" opacity="0.8" rx="1"/>
          <rect x="58" y="30" width="15" height="3" fill="currentColor" opacity="0.5" rx="1"/>
          
          <rect x="25" y="38" width="12" height="2.5" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="25" y="43" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <rect x="30" y="44" width="25" height="1.5" fill="currentColor" opacity="0.4" rx="0.5"/>
          <rect x="25" y="48" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <path d="M 26,49 L 27,50.5 L 28.5,48.5" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.7"/>
          <rect x="30" y="49" width="28" height="1.5" fill="currentColor" opacity="0.4" rx="0.5"/>
          <rect x="25" y="53" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <rect x="30" y="54" width="22" height="1.5" fill="currentColor" opacity="0.4" rx="0.5"/>
          
          <rect x="25" y="62" width="15" height="2.5" fill="currentColor" opacity="0.7" rx="0.5"/>
          <rect x="25" y="67" width="35" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="71" width="40" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          <rect x="25" y="75" width="32" height="1.5" fill="currentColor" opacity="0.3" rx="0.5"/>
          
          <circle cx="72" cy="78" r="4" fill="currentColor" opacity="0.6"/>
          <path d="M 70,78 L 71.5,79.5 L 74,77" stroke="var(--background)" strokeWidth="1" fill="none"/>
        </svg>
      );
    
    default:
      return <FileText className="w-6 h-6" />;
  }
};

// Chart icon component
const ChartIcon = ({ type, className }: { type: string; className?: string }) => {
  const baseClasses = cn('w-full h-full text-foreground', className);
  
  switch (type) {
    case 'bar':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <rect x="15" y="50" width="14" height="35" opacity="0.7" rx="2"/>
          <rect x="35" y="35" width="14" height="50" opacity="0.8" rx="2"/>
          <rect x="55" y="45" width="14" height="40" opacity="0.7" rx="2"/>
          <rect x="75" y="25" width="14" height="60" opacity="0.85" rx="2"/>
          <line x1="10" y1="85" x2="95" y2="85" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
        </svg>
      );
    
    case 'line':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="none">
          {/* Grid lines */}
          <line x1="10" y1="85" x2="90" y2="85" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
          <line x1="10" y1="70" x2="90" y2="70" stroke="currentColor" strokeWidth="0.5" opacity="0.1" strokeDasharray="2,2"/>
          <line x1="10" y1="55" x2="90" y2="55" stroke="currentColor" strokeWidth="0.5" opacity="0.1" strokeDasharray="2,2"/>
          <line x1="10" y1="40" x2="90" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.1" strokeDasharray="2,2"/>
          <line x1="10" y1="25" x2="90" y2="25" stroke="currentColor" strokeWidth="0.5" opacity="0.1" strokeDasharray="2,2"/>
          
          {/* Line path */}
          <path d="M 15,70 L 30,50 L 45,55 L 60,35 L 75,30 L 90,40" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                opacity="0.7"
                strokeLinecap="round" 
                strokeLinejoin="round"
                fill="none"/>
          
          {/* Area fill */}
          <path d="M 15,70 L 30,50 L 45,55 L 60,35 L 75,30 L 90,40 L 90,85 L 15,85 Z" 
                fill="currentColor" 
                opacity="0.1"/>
          
          {/* Data points */}
          <circle cx="15" cy="70" r="3" fill="currentColor" opacity="0.8"/>
          <circle cx="30" cy="50" r="3" fill="currentColor" opacity="0.8"/>
          <circle cx="45" cy="55" r="3" fill="currentColor" opacity="0.8"/>
          <circle cx="60" cy="35" r="3" fill="currentColor" opacity="0.8"/>
          <circle cx="75" cy="30" r="3" fill="currentColor" opacity="0.8"/>
          <circle cx="90" cy="40" r="3" fill="currentColor" opacity="0.8"/>
        </svg>
      );
    
    case 'pie':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          {/* Slice 1: 40% (144 degrees) - from top to right-bottom */}
          <path d="M 50,50 L 50,15 A 35,35 0 0,1 78.5,73.5 Z" opacity="0.8" />
          
          {/* Slice 2: 30% (108 degrees) - continuing clockwise */}
          <path d="M 50,50 L 78.5,73.5 A 35,35 0 0,1 21.5,73.5 Z" opacity="0.6" />
          
          {/* Slice 3: 20% (72 degrees) - continuing clockwise */}
          <path d="M 50,50 L 21.5,73.5 A 35,35 0 0,1 28.5,26.5 Z" opacity="0.7" />
          
          {/* Slice 4: 10% (36 degrees) - completing the circle */}
          <path d="M 50,50 L 28.5,26.5 A 35,35 0 0,1 50,15 Z" opacity="0.5" />
          
          {/* Optional donut hole */}
          <circle cx="50" cy="50" r="15" fill="var(--background)" />
        </svg>
      );
    
    case 'scatter':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          {/* Grid lines */}
          <line x1="10" y1="85" x2="90" y2="85" stroke="currentColor" strokeWidth="1" opacity="0.15"/>
          <line x1="10" y1="15" x2="10" y2="85" stroke="currentColor" strokeWidth="1" opacity="0.15"/>
          
          {/* Data points with varying sizes */}
          <circle cx="22" cy="65" r="3.5" opacity="0.7"/>
          <circle cx="28" cy="48" r="2.5" opacity="0.6"/>
          <circle cx="35" cy="60" r="4" opacity="0.75"/>
          <circle cx="42" cy="42" r="3" opacity="0.65"/>
          <circle cx="48" cy="52" r="3.5" opacity="0.7"/>
          <circle cx="54" cy="35" r="2.5" opacity="0.6"/>
          <circle cx="58" cy="45" r="4" opacity="0.75"/>
          <circle cx="65" cy="30" r="3" opacity="0.65"/>
          <circle cx="70" cy="38" r="3.5" opacity="0.7"/>
          <circle cx="75" cy="25" r="2.5" opacity="0.6"/>
          <circle cx="80" cy="32" r="3" opacity="0.65"/>
          <circle cx="84" cy="20" r="2" opacity="0.5"/>
          
          {/* Trend line */}
          <path d="M 20,70 Q 50,50 85,20" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" strokeDasharray="3,3"/>
        </svg>
      );
    
    case 'heatmap':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          {/* Grid with varying opacities to simulate heat */}
          <rect x="15" y="20" width="13" height="13" opacity="0.3" rx="2"/>
          <rect x="30" y="20" width="13" height="13" opacity="0.5" rx="2"/>
          <rect x="45" y="20" width="13" height="13" opacity="0.7" rx="2"/>
          <rect x="60" y="20" width="13" height="13" opacity="0.4" rx="2"/>
          <rect x="75" y="20" width="13" height="13" opacity="0.6" rx="2"/>
          
          <rect x="15" y="35" width="13" height="13" opacity="0.4" rx="2"/>
          <rect x="30" y="35" width="13" height="13" opacity="0.8" rx="2"/>
          <rect x="45" y="35" width="13" height="13" opacity="0.9" rx="2"/>
          <rect x="60" y="35" width="13" height="13" opacity="0.7" rx="2"/>
          <rect x="75" y="35" width="13" height="13" opacity="0.5" rx="2"/>
          
          <rect x="15" y="50" width="13" height="13" opacity="0.5" rx="2"/>
          <rect x="30" y="50" width="13" height="13" opacity="0.7" rx="2"/>
          <rect x="45" y="50" width="13" height="13" opacity="0.85" rx="2"/>
          <rect x="60" y="50" width="13" height="13" opacity="0.9" rx="2"/>
          <rect x="75" y="50" width="13" height="13" opacity="0.6" rx="2"/>
          
          <rect x="15" y="65" width="13" height="13" opacity="0.3" rx="2"/>
          <rect x="30" y="65" width="13" height="13" opacity="0.4" rx="2"/>
          <rect x="45" y="65" width="13" height="13" opacity="0.6" rx="2"/>
          <rect x="60" y="65" width="13" height="13" opacity="0.8" rx="2"/>
          <rect x="75" y="65" width="13" height="13" opacity="0.7" rx="2"/>
        </svg>
      );
    
    case 'bubble':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          {/* Grid lines */}
          <line x1="10" y1="85" x2="90" y2="85" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
          <line x1="10" y1="15" x2="10" y2="85" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
          
          {/* Bubbles with better distribution */}
          <circle cx="25" cy="65" r="12" opacity="0.3" stroke="currentColor" strokeWidth="1" fill="currentColor"/>
          <circle cx="45" cy="45" r="18" opacity="0.4" stroke="currentColor" strokeWidth="1" fill="currentColor"/>
          <circle cx="65" cy="55" r="14" opacity="0.35" stroke="currentColor" strokeWidth="1" fill="currentColor"/>
          <circle cx="75" cy="28" r="20" opacity="0.45" stroke="currentColor" strokeWidth="1" fill="currentColor"/>
          <circle cx="30" cy="35" r="10" opacity="0.3" stroke="currentColor" strokeWidth="1" fill="currentColor"/>
          <circle cx="80" cy="70" r="8" opacity="0.35" stroke="currentColor" strokeWidth="1" fill="currentColor"/>
          <circle cx="55" cy="25" r="6" opacity="0.3" stroke="currentColor" strokeWidth="1" fill="currentColor"/>
        </svg>
      );
    
    case 'wordcloud':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          <text x="50" y="30" fontSize="18" textAnchor="middle" opacity="0.9" fontWeight="700">DATA</text>
          <text x="28" y="45" fontSize="14" textAnchor="middle" opacity="0.7" fontWeight="600">cloud</text>
          <text x="72" y="48" fontSize="12" textAnchor="middle" opacity="0.6" fontWeight="500">analysis</text>
          <text x="50" y="60" fontSize="16" textAnchor="middle" opacity="0.8" fontWeight="600">VISUAL</text>
          <text x="25" y="72" fontSize="10" textAnchor="middle" opacity="0.5">metrics</text>
          <text x="75" y="70" fontSize="11" textAnchor="middle" opacity="0.55" fontWeight="500">insights</text>
          <text x="50" y="80" fontSize="9" textAnchor="middle" opacity="0.4">report</text>
          <text x="35" y="55" fontSize="8" textAnchor="middle" opacity="0.4">big</text>
          <text x="65" y="35" fontSize="8" textAnchor="middle" opacity="0.4">text</text>
        </svg>
      );
    
    case 'stacked':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="currentColor">
          {/* Base line */}
          <line x1="10" y1="85" x2="90" y2="85" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
          
          {/* Stacked bars with gradient effect */}
          <rect x="15" y="60" width="14" height="25" opacity="0.4" rx="1"/>
          <rect x="15" y="42" width="14" height="18" opacity="0.6" rx="1"/>
          <rect x="15" y="30" width="14" height="12" opacity="0.8" rx="1"/>
          
          <rect x="33" y="50" width="14" height="35" opacity="0.4" rx="1"/>
          <rect x="33" y="35" width="14" height="15" opacity="0.6" rx="1"/>
          <rect x="33" y="25" width="14" height="10" opacity="0.8" rx="1"/>
          
          <rect x="51" y="55" width="14" height="30" opacity="0.4" rx="1"/>
          <rect x="51" y="38" width="14" height="17" opacity="0.6" rx="1"/>
          <rect x="51" y="28" width="14" height="10" opacity="0.8" rx="1"/>
          
          <rect x="69" y="45" width="14" height="40" opacity="0.4" rx="1"/>
          <rect x="69" y="28" width="14" height="17" opacity="0.6" rx="1"/>
          <rect x="69" y="18" width="14" height="10" opacity="0.8" rx="1"/>
        </svg>
      );
    
    case 'area':
      return (
        <svg viewBox="0 0 100 100" className={baseClasses} fill="none">
          {/* Grid lines */}
          <line x1="10" y1="85" x2="90" y2="85" stroke="currentColor" strokeWidth="1" opacity="0.15"/>
          
          {/* Multiple area layers */}
          <path d="M 10,75 Q 25,65 40,68 T 70,55 Q 85,50 90,60 L 90,85 L 10,85 Z" 
                fill="currentColor" 
                opacity="0.2"/>
          <path d="M 10,65 Q 30,45 50,50 T 90,35 L 90,85 L 10,85 Z" 
                fill="currentColor" 
                opacity="0.25"/>
          
          {/* Top lines */}
          <path d="M 10,75 Q 25,65 40,68 T 70,55 Q 85,50 90,60" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                opacity="0.5" 
                strokeLinecap="round"/>
          <path d="M 10,65 Q 30,45 50,50 T 90,35" 
                stroke="currentColor" 
                strokeWidth="2" 
                opacity="0.7" 
                strokeLinecap="round"/>
        </svg>
      );
    
    default:
      return <BarChart3 className="w-6 h-6 text-muted-foreground/50" />;
  }
};

export function SunaModesPanel({ 
  selectedMode, 
  onModeSelect, 
  onSelectPrompt, 
  isMobile = false,
  selectedCharts: controlledSelectedCharts,
  onChartsChange,
  selectedOutputFormat: controlledSelectedOutputFormat,
  onOutputFormatChange,
  selectedTemplate: controlledSelectedTemplate,
  onTemplateChange,
  isFreeTier = false,
  onUpgradeClick,
}: SunaModesPanelProps) {
  const t = useTranslations('suna');
  const currentMode = selectedMode ? modes.find((m) => m.id === selectedMode) : null;
  const promptCount = isMobile ? 2 : 4;
  
  // Get translated prompts for a mode (preserving thumbnails)
  const getTranslatedPrompts = (modeId: string): SamplePrompt[] => {
    const mode = modes.find((m) => m.id === modeId);
    if (!mode) return [];
    
    // Use the hardcoded prompts length as the limit to avoid accessing non-existent translations
    const maxPrompts = mode.samplePrompts.length;
    const prompts: SamplePrompt[] = [];
    
    for (let index = 0; index < maxPrompts; index++) {
      const originalPrompt = mode.samplePrompts[index];
      try {
        const key = `prompts.${modeId}.${index}` as any;
        const translatedText = t(key);
        // Check if translation exists (next-intl returns the key if missing)
        if (!translatedText || translatedText === `suna.${key}` || translatedText.startsWith('suna.prompts.') || translatedText.includes(modeId)) {
          // If translation is missing, use the hardcoded prompt
          prompts.push(originalPrompt);
        } else {
          // Use translated text but keep the original thumbnail
          prompts.push({ text: translatedText, thumbnail: originalPrompt.thumbnail });
        }
      } catch {
        // Fallback to hardcoded prompt on error
        prompts.push(originalPrompt);
      }
    }
    
    return prompts;
  };
  
  // State to track current random selection of prompts
  const [randomizedPrompts, setRandomizedPrompts] = useState<SamplePrompt[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // State for PDF preview modal
  const [selectedTemplate, setSelectedTemplate] = useState<{id: string, name: string} | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [preloadedTemplates, setPreloadedTemplates] = useState<Set<string>>(new Set());
  
  // State for multi-select charts (use controlled state if provided)
  const [uncontrolledSelectedCharts, setUncontrolledSelectedCharts] = useState<string[]>([]);
  const selectedCharts = controlledSelectedCharts ?? uncontrolledSelectedCharts;
  const setSelectedCharts = onChartsChange ?? setUncontrolledSelectedCharts;
  
  // State for selected output format (use controlled state if provided)
  const [uncontrolledSelectedOutputFormat, setUncontrolledSelectedOutputFormat] = useState<string | null>(null);
  const selectedOutputFormat = controlledSelectedOutputFormat ?? uncontrolledSelectedOutputFormat;
  const setSelectedOutputFormat = onOutputFormatChange ?? setUncontrolledSelectedOutputFormat;

  // State for selected template (use controlled state if provided)
  const [uncontrolledSelectedTemplateId, setUncontrolledSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplateId = controlledSelectedTemplate ?? uncontrolledSelectedTemplateId;
  const setSelectedTemplateId = onTemplateChange ?? setUncontrolledSelectedTemplateId;

  // Randomize prompts when mode changes or on mount
  useEffect(() => {
    if (selectedMode) {
      const translatedPrompts = getTranslatedPrompts(selectedMode);
      setRandomizedPrompts(getRandomPrompts(translatedPrompts, promptCount));
    }
  }, [selectedMode, promptCount, t]);
  
  // Reset selections when mode changes
  useEffect(() => {
    setSelectedCharts([]);
    setSelectedOutputFormat(null);
    setSelectedTemplateId(null);
  }, [selectedMode, setSelectedCharts, setSelectedOutputFormat, setSelectedTemplateId]);

  // Handler for refresh button
  const handleRefreshPrompts = () => {
    if (selectedMode) {
      setIsRefreshing(true);
      const translatedPrompts = getTranslatedPrompts(selectedMode);
      setRandomizedPrompts(getRandomPrompts(translatedPrompts, promptCount));
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };
  
  // Handler for chart selection toggle
  const handleChartToggle = (chartId: string) => {
    const newCharts = selectedCharts.includes(chartId) 
      ? selectedCharts.filter(id => id !== chartId)
      : [...selectedCharts, chartId];
    setSelectedCharts(newCharts);
  };
  
  // Handler for output format selection
  const handleOutputFormatSelect = (formatId: string) => {
    const newFormat = selectedOutputFormat === formatId ? null : formatId;
    setSelectedOutputFormat(newFormat);
  };
  
  // Handler for prompt selection - just pass through without modification
  const handlePromptSelect = (prompt: string) => {
    onSelectPrompt(prompt);
  };

  // Handler for template selection (only stores the template ID)
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  // Handler to preload PDF on hover
  const handlePreloadPdf = (templateId: string) => {
    // Only preload if not already preloaded
    if (preloadedTemplates.has(templateId)) return;

    // Create a prefetch link
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = getPdfUrl(templateId);
    link.as = 'document';
    document.head.appendChild(link);

    // Track this template as preloaded
    setPreloadedTemplates(prev => new Set(prev).add(templateId));
  };

  // Handler for PDF preview
  const handlePdfPreview = (templateId: string, templateName: string) => {
    setSelectedTemplate({id: templateId, name: templateName});
    setIsPdfLoading(true);
    setIsPdfModalOpen(true);
  };

  const displayedPrompts = randomizedPrompts;

  return (
    <div className="w-full space-y-4">
      {/* Mode Tabs - Kortix minimal design */}
      <div className="flex items-center justify-center animate-in fade-in-0 zoom-in-95 duration-300 px-2 sm:px-0">
        <div className="grid grid-cols-3 gap-2 sm:inline-flex sm:gap-2">
          {modes.map((mode) => {
            const isActive = selectedMode === mode.id;
            return (
              <motion.button
                key={mode.id}
                onClick={() => onModeSelect(isActive ? null : mode.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  // Base button styles matching Kortix design
                  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium",
                  "outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "relative h-10 px-3 sm:px-4 gap-2 shrink-0 rounded-2xl cursor-pointer",
                  "border-[1.5px] transition-all duration-200",
                  // Active state - clean, minimal style without colored accents
                  isActive
                    ? "bg-muted text-foreground border-border font-medium"
                    : "bg-background/50 border-border/40 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted dark:bg-card/30 dark:hover:bg-muted"
                )}
              >
                {/* Icon */}
                <span className="transition-colors duration-200 [&>svg]:w-4 [&>svg]:h-4">
                  {modeIconById[mode.id as SunaModeId]}
                </span>
                
                {/* Label */}
                <span className="transition-colors duration-200">
                  {mode.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Mode-specific Options - Only show when a mode is selected */}
      {selectedMode && currentMode?.options && (
        <div className="space-y-3 animate-in fade-in-0 zoom-in-95 duration-300 delay-75">
          <p className="text-xs text-muted-foreground/60">
            {currentMode.options.title === 'Choose a style' ? t('chooseStyle') :
             currentMode.options.title === 'Choose a template' ? t('chooseTemplate') :
             currentMode.options.title === 'Choose output format' ? t('chooseOutputFormat') :
             currentMode.options.title}
          </p>
          
          {selectedMode === 'image' && (
            <ScrollArea className="w-full">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-2">
                {currentMode.options.items.map((item) => (
                  <Card
                    key={item.id}
                    className="flex flex-col items-center gap-2 cursor-pointer group p-2 hover:bg-muted transition-all duration-200 border border-border rounded-xl overflow-hidden"
                    onClick={() => handlePromptSelect(`Generate an image using ${item.name.toLowerCase()} style`)}
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-muted/50 to-muted rounded-lg border border-border/50 group-hover:border-primary/50 group-hover:scale-105 transition-all duration-200 flex items-center justify-center overflow-hidden relative">
                      {item.image ? (
                        <Image 
                          src={item.image} 
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary/70 transition-colors duration-200" />
                      )}
                    </div>
                    <span className="text-xs text-center text-muted-foreground group-hover:text-foreground transition-colors duration-200 font-medium">
                      {t(`styles.${item.id}`) || item.name}
                    </span>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {selectedMode === 'slides' && (
            <ScrollArea className="w-full">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-2">
                {currentMode.options.items.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-2 cursor-pointer group p-2 hover:bg-muted transition-all duration-200 border rounded-xl relative",
                      selectedTemplateId === item.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                    onClick={() => handleTemplateSelect(item.id)}
                  >
                    <div className="w-full bg-muted/30 rounded-lg border border-border/50 group-hover:border-primary/50 group-hover:scale-[1.02] transition-all duration-200 overflow-hidden relative aspect-video">
                      {item.image ? (
                        <Image 
                          src={item.image} 
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <SlideTemplateIcon 
                          type={item.id} 
                          className="text-foreground/50 group-hover:text-primary/70 transition-colors duration-200" 
                        />
                      )}
                      {/* Preview button overlay */}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 hover:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800 shadow-md"
                        onMouseEnter={() => handlePreloadPdf(item.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePdfPreview(item.id, item.name);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                        {t(`templates.${item.id}.name`) || item.name}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {selectedMode === 'docs' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {currentMode.options.items.map((item) => (
                <Card
                  key={item.id}
                  className="flex flex-col items-center gap-3 cursor-pointer group p-4 bg-transparent hover:bg-muted transition-all duration-200 border border-border rounded-xl overflow-hidden shadow-none"
                  onClick={() =>
                    handlePromptSelect(
                      `Create a ${item.name} document: ${item.description}`
                    )
                  }
                >
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 group-hover:bg-primary/10 border border-border/50 group-hover:border-primary/30 group-hover:scale-105 transition-all duration-200 flex items-center justify-center text-muted-foreground group-hover:text-primary">
                    {getOptionIcon((item as { icon?: string }).icon || '')}
                  </div>
                  <span className="text-xs text-center text-muted-foreground group-hover:text-foreground transition-colors duration-200 font-medium">
                    {t(`templates.${item.id}.name`) || item.name}
                  </span>
                </Card>
              ))}
            </div>
          )}

          {selectedMode === 'data' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {currentMode.options.items.map((item) => {
                const isSelected = selectedOutputFormat === item.id;
                
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "flex flex-col items-center gap-3 cursor-pointer group p-4 transition-all duration-200 border rounded-xl overflow-hidden shadow-none",
                      isSelected 
                        ? "bg-primary/10 border-primary" 
                        : "bg-transparent hover:bg-muted border-border"
                    )}
                    onClick={() => handleOutputFormatSelect(item.id)}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl border group-hover:scale-105 transition-all duration-200 flex items-center justify-center",
                      isSelected
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-muted/50 border-border/50 group-hover:bg-primary/10 group-hover:border-primary/30 text-muted-foreground group-hover:text-primary"
                    )}>
                      {getOptionIcon((item as { icon?: string }).icon || '')}
                    </div>
                    <span className={cn(
                      "text-xs text-center transition-colors duration-200 font-medium",
                      isSelected
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {t(`outputFormats.${item.id}.name`) || item.name}
                    </span>
                  </Card>
                );
              })}
            </div>
          )}

          {selectedMode === 'canvas' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {currentMode.options.items.map((item) => {
                // Generate action-specific prompts
                const getCanvasPrompt = (actionId: string) => {
                  switch (actionId) {
                    case 'create':
                      return 'Create a new image for me: [describe what you want]';
                    case 'edit':
                      return 'Edit my image: [I will upload the image and describe what changes I want]';
                    case 'upscale':
                      return 'Upscale my image to higher resolution - I will upload the image';
                    case 'remove-bg':
                      return 'Remove the background from my image - I will upload the image';
                    default:
                      return `${item.name}: ${item.description}`;
                  }
                };
                
                return (
                  <Card
                    key={item.id}
                    className="flex flex-col items-center gap-3 cursor-pointer group p-4 bg-transparent hover:bg-muted transition-all duration-200 border border-border rounded-xl overflow-hidden shadow-none"
                    onClick={() => handlePromptSelect(getCanvasPrompt(item.id))}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-muted/50 group-hover:bg-primary/10 border border-border/50 group-hover:border-primary/30 group-hover:scale-105 transition-all duration-200 flex items-center justify-center text-muted-foreground group-hover:text-primary">
                      {getOptionIcon((item as { icon?: string }).icon || '')}
                    </div>
                    <span className="text-xs text-center text-muted-foreground group-hover:text-foreground transition-colors duration-200 font-medium">
                      {item.name}
                    </span>
                  </Card>
                );
              })}
            </div>
          )}

          {selectedMode === 'video' && (
            <ScrollArea className="w-full">
              <div className={cn(
                "grid grid-cols-2 sm:grid-cols-4 gap-3 pb-2",
                isFreeTier && "opacity-50 pointer-events-none"
              )}>
                {currentMode.options.items.map((item) => (
                  <Card
                    key={item.id}
                    className="flex flex-col items-center gap-2 cursor-pointer group p-2 hover:bg-muted transition-all duration-200 border border-border rounded-xl overflow-hidden relative"
                    onClick={() => !isFreeTier && handlePromptSelect(`Generate a ${item.name.toLowerCase()} style video`)}
                  >
                    <div className="w-full aspect-square rounded-lg border border-border/50 group-hover:border-primary/50 group-hover:scale-105 transition-all duration-200 flex items-center justify-center overflow-hidden relative">
                      {item.image ? (
                        <Image 
                          src={item.image} 
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Video className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary/70 transition-colors duration-200" />
                      )}
                      {/* Lock overlay for free users */}
                      {isFreeTier && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-center text-muted-foreground group-hover:text-foreground transition-colors duration-200 font-medium">
                      {item.name}
                    </span>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </div>
      )}

      {/* Chart Types Section (for Data mode) - Only show when data is selected */}
      {selectedMode === 'data' && currentMode?.chartTypes && (
        <div className="space-y-3 animate-in fade-in-0 zoom-in-95 duration-300 delay-150">
          <p className="text-xs text-muted-foreground/60">
            {t('preferredCharts')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {currentMode.chartTypes.items.map((chart) => {
              const isSelected = selectedCharts.includes(chart.id);
              return (
                <Card
                  key={chart.id}
                  className={cn(
                    "flex flex-col items-center gap-3 cursor-pointer group p-4 transition-all duration-200 border rounded-xl overflow-hidden shadow-none",
                    isSelected 
                      ? "bg-primary/10 border-primary" 
                      : "bg-transparent hover:bg-muted border-border"
                  )}
                  onClick={() => handleChartToggle(chart.id)}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl border group-hover:scale-105 transition-all duration-200 flex items-center justify-center",
                    isSelected
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-muted/50 border-border/50 group-hover:bg-primary/10 group-hover:border-primary/30 text-muted-foreground group-hover:text-primary"
                  )}>
                    {getOptionIcon((chart as { icon?: string }).icon || '')}
                  </div>
                  <span className={cn(
                    "text-xs text-center transition-colors duration-200 font-medium",
                    isSelected 
                      ? "text-foreground" 
                      : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {t(`charts.${chart.id}`) || chart.name}
                  </span>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Sample Prompts - Visual Grid with Thumbnails */}
      {selectedMode && displayedPrompts && displayedPrompts.length > 0 && (
        <div className="animate-in fade-in-0 zoom-in-95 duration-300">
          {/* Upgrade Banner for Video Mode - Free Users */}
          {selectedMode === 'video' && isFreeTier && (
            <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Video Generation is a Pro Feature</p>
                  <p className="text-xs text-muted-foreground">Upgrade your plan to create AI videos</p>
                </div>
              </div>
              {onUpgradeClick && (
                <Button 
                  size="sm" 
                  onClick={onUpgradeClick}
                  className="shrink-0"
                >
                  Upgrade
                </Button>
              )}
            </div>
          )}
          
          <div className={cn(
            "space-y-3",
            selectedMode === 'video' && isFreeTier && "opacity-50 pointer-events-none"
          )}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground/60">
                {t('samplePrompts')}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshPrompts}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <motion.div
                  animate={{ rotate: isRefreshing ? 360 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </motion.div>
              </Button>
            </div>
            <PromptExamples
              prompts={displayedPrompts}
              onPromptClick={handlePromptSelect}
              variant="text"
              columns={1}
              showTitle={false}
            />
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>
              Template Preview: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0">
            {selectedTemplate && (
              <div className="relative">
                {/* Loading overlay */}
                {isPdfLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10">
                    <div className="flex flex-col items-center gap-3">
                      <KortixLoader size="medium" />
                      <p className="text-sm text-muted-foreground">Loading preview...</p>
                    </div>
                  </div>
                )}
                <iframe
                  src={getPdfUrl(selectedTemplate.id)}
                  className="w-full h-[70vh] border rounded-lg"
                  title={`${selectedTemplate.name} template preview`}
                  onLoad={() => setIsPdfLoading(false)}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

