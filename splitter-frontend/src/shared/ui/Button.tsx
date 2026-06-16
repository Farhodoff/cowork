import React from 'react'
import { Button as TamaguiButton, Text } from 'tamagui'

interface CustomButtonProps {
  title: string
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  onPress?: () => void
}

export const Button: React.FC<CustomButtonProps> = ({ 
  title, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onPress,
}) => {
  const getStyles = () => {
    const baseStyles = {
      borderRadius: 14,
      pressStyle: { scale: 0.97 },
    }

    const sizeStyles = {
      small: { height: '$3', paddingHorizontal: '$4' },
      medium: { height: '$4', paddingHorizontal: '$6' },
      large: { height: 52, paddingHorizontal: '$8' }, // taller
    }

    const variantStyles = {
      primary: {
        backgroundColor: disabled ? 'rgba(255, 255, 255, 0.08)' : '#7c4dff',
        color: '#FFFFFF',
      },
      secondary: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        color: 'rgba(255, 255, 255, 0.88)',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? 'rgba(255, 255, 255, 0.08)' : '#7c4dff',
        color: disabled ? 'rgba(255, 255, 255, 0.3)' : '#7c4dff',
      }
    }

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
    }
  }

  const styles = getStyles()

  return (
    <TamaguiButton
      {...styles}
      disabled={disabled}
      onPress={onPress}
    >
      <Text 
        color={styles.color}
        fontWeight="600"
        fontSize="$4"
      >
        {title}
      </Text>
    </TamaguiButton>
  )
}