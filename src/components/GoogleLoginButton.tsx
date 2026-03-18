import React from 'react';
import { ViewStyle, Image, View, Text } from 'react-native';
import Button from './Button';
import { colors } from '../theme';

interface GoogleLoginButtonProps {
    onPress: () => void;
    loading?: boolean;
    style?: ViewStyle;
    text?: string;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
    onPress,
    loading = false,
    style,
    text = 'Continue with Google',
}) => {
    return (
        <Button
            title={text}
            onPress={onPress}
            loading={loading}
            variant="outline"
            style={[
                {
                    borderColor: colors.neutral[300],
                    backgroundColor: '#FFFFFF',
                },
                style,
            ]}
            textStyle={{
                color: colors.neutral[700],
                marginLeft: 8,
            }}
            icon={
                <Image
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }}
                    style={{ width: 20, height: 20 }}
                    resizeMode="contain"
                />
            }
        />
    );
};

export default GoogleLoginButton;
