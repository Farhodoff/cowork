// src/shared/ui/Card.tsx
import React from 'react'
import { YStack } from 'tamagui'

interface CardProps {
  children: React.ReactNode
  padding?: string
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = '$4'
}) => {
  return (
    <YStack
      backgroundColor="rgba(255, 255, 255, 0.04)"
      borderRadius="$6"
      borderWidth={0.5}
      borderColor="rgba(255, 255, 255, 0.08)"
      padding={padding}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.2}
      shadowRadius={12}
      elevation={2}
    >
      {children}
    </YStack>
  )
}
