import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import SkeletonLoader from './SkeletonLoader';
import ImageZoomModal from './ImageZoomModal';

interface ImageGalleryProps {
  images: string[];
  style?: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH;

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, style }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string>('');

  if (!images || images.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.placeholder}>
          <Icon name="image-off" size={64} color="#ccc" />
        </View>
      </View>
    );
  }

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / IMAGE_WIDTH);
    setCurrentIndex(index);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  const handleImagePress = (imageUri: string) => {
    setZoomedImage(imageUri);
    setZoomVisible(true);
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((image, index) => (
          <TouchableOpacity
            key={index}
            style={styles.imageContainer}
            onPress={() => handleImagePress(image)}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={`View image ${index + 1} in full screen`}
          >
            {imageLoading[index] !== false && (
              <View style={styles.loadingContainer}>
                <SkeletonLoader width={IMAGE_WIDTH} height={300} />
              </View>
            )}
            <Image
              source={{ uri: image }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              onLoadStart={() => setImageLoading({ ...imageLoading, [index]: true })}
              onLoadEnd={() => setImageLoading({ ...imageLoading, [index]: false })}
            />

          </TouchableOpacity>
        ))}
      </ScrollView>

      {images.length > 1 && (
        <View style={styles.indicators}>
          {images.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.indicator,
                currentIndex === index && styles.indicatorActive,
              ]}
              onPress={() => goToImage(index)}
            />
          ))}
        </View>
      )}

      <ImageZoomModal
        visible={zoomVisible}
        imageUri={zoomedImage}
        onClose={() => setZoomVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  imageContainer: {
    width: IMAGE_WIDTH,
    height: 300,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  placeholder: {
    width: IMAGE_WIDTH,
    height: 300,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  zoomHint: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
});

export default ImageGallery;

