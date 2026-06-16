// src/shared/ui/Fab.tsx
import { Button, View } from 'tamagui';
import { Plus } from '@tamagui/lucide-icons';

type Props = { onPress: () => void };

export default function Fab({ onPress }: Props) {
  return (
    <View
      position="absolute"
      bottom={110}
      right={24}
      zIndex={100}
    >
      <Button
        onPress={onPress}
        circular
        size="$6"
        backgroundColor="#7c4dff"
        pressStyle={{ backgroundColor: '#651fff', scale: 0.95 }}
        icon={<Plus size={24} color="white" />}
        aria-label="Add Friend"
        elevation={4}
        shadowColor="#000"
        shadowOpacity={0.3}
        shadowRadius={8}
        shadowOffset={{ width: 0, height: 4 }}
        borderWidth={0}
      />
    </View>
  );
}