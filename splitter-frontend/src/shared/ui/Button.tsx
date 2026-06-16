import React from 'react'
import { Button as TamaguiButton, Text } from 'tamagui'

interface CustomButtonProps {
  title: string
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  onPress?: () => void
  [key: string]: any
}

export const Button: React.FC<CustomButtonProps> = ({ 
  title, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onPress,
  ...rest
}) => {
  const getStyles = () => {
    const baseStyles = {
      borderRadius: 14,
      pressStyle: { scale: 0.97 },
    }

    const sizeStyles = {
      small: { height: 36, paddingHorizontal: 16 },
      medium: { height: 44, paddingHorizontal: 24 },
      large: { height: 52, paddingHorizontal: 32 },
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
      {...rest}
      disabled={disabled}
      onPress={onPress}
      justifyContent="center"
      alignItems="center"
    >
      <Text 
        color={styles.color}
        fontWeight="600"
        fontSize={16}
        lineHeight={20}
      >
        {title}
      </Text>
    </TamaguiButton>
  )
}