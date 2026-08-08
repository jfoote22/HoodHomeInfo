import { DashboardTheme } from './theme';

export function WeatherIcon({ icon, size, theme }: { icon: string; size: number; theme: DashboardTheme }) {
  const sunColor = theme.iconAccent;
  const cloudColor = theme.isLight ? '#9fb1c6' : '#9fb4cf';

  if (icon === 'cloud' || icon === 'cloud-fog') {
    return (
      <svg width={size} height={size} viewBox="0 0 28 22">
        <circle cx={10} cy={13} r={6} fill={cloudColor} />
        <circle cx={18} cy={10} r={7} fill={cloudColor} />
        <rect x={8} y={12} width={15} height={7} rx={3} fill={cloudColor} />
      </svg>
    );
  }

  if (icon === 'cloud-rain' || icon === 'cloud-lightning' || icon === 'cloud-snow') {
    return (
      <svg width={size} height={size} viewBox="0 0 28 26">
        <circle cx={10} cy={11} r={6} fill={cloudColor} />
        <circle cx={18} cy={8} r={7} fill={cloudColor} />
        <rect x={8} y={10} width={15} height={7} rx={3} fill={cloudColor} />
        <g stroke={theme.accentA} strokeWidth={2} strokeLinecap="round">
          <line x1={12} y1={20} x2={10} y2={24} />
          <line x1={17} y1={20} x2={15} y2={24} />
        </g>
      </svg>
    );
  }

  // sun (default)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx={12} cy={12} r={5} fill={sunColor} />
      <g stroke={sunColor} strokeWidth={2} strokeLinecap="round">
        <line x1={12} y1={1} x2={12} y2={3.5} />
        <line x1={12} y1={20.5} x2={12} y2={23} />
        <line x1={1} y1={12} x2={3.5} y2={12} />
        <line x1={20.5} y1={12} x2={23} y2={12} />
        <line x1={4} y1={4} x2={5.8} y2={5.8} />
        <line x1={18.2} y1={18.2} x2={20} y2={20} />
        <line x1={20} y1={4} x2={18.2} y2={5.8} />
        <line x1={5.8} y1={18.2} x2={4} y2={20} />
      </g>
    </svg>
  );
}
