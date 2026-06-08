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
        backgroundColor: disabled ? '$gray8' : '#312E81',
        color: '#FFFFFF',
      },
      secondary: {
        backgroundColor: '$gray4',
        color: '$gray12',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? '$gray8' : '#312E81',
        color: disabled ? '$gray8' : '#312E81',
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