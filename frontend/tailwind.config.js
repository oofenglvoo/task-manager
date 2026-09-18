export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0a0a0c',
        surface: '#131316',
        elevated: '#1a1a1f',
        line: '#26262c',
        'line-strong': '#33333b',
        ink: '#ececf1',
        'ink-soft': '#a5a5b0',
        muted: '#6f6f7a',
        accent: {
          DEFAULT: '#5e6ad2',
          hover: '#6d78dd',
          soft: 'rgba(94, 106, 210, 0.15)',
        },
        priority: {
          low: '#6b7280',
          medium: '#f59e0b',
          high: '#ef4444',
        },
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255, 255, 255, 0.03), 0 8px 24px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
}
