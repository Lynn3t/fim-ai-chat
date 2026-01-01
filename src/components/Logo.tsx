'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Box } from '@mui/material'

interface LogoProps {
  size?: number
}

export default function Logo({ size = 80 }: LogoProps) {
  const { mode } = useTheme()

  // 根据主题选择填充颜色
  const fillColor = mode === 'dark' ? 'white' : 'black'

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      sx={{ display: 'block' }}
    >
      <g transform="translate(55, 45)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M30 0C13.4315 0 0 13.4315 0 30V110C0 126.569 13.4315 140 30 140H35C51.5685 140 65 126.569 65 110V85H90C106.569 85 120 71.5685 120 55V30C120 13.4315 106.569 0 90 0H30ZM65 55V30H90C103.807 30 115 41.1929 115 55C115 68.8071 103.807 80 90 80H65V55ZM30 30C16.1929 30 5 41.1929 5 55V110C5 123.807 16.1929 135 30 135C43.8071 135 55 123.807 55 110V30H30Z"
          fill={fillColor}
        />
      </g>
    </Box>
  )
}
