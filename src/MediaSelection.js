import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableHighlight, Dimensions, TouchableOpacity, Image, StatusBar, SafeAreaView } from 'react-native';

// styles
import { AntDesign } from '@expo/vector-icons';

// third lib
import * as MediaLibrary from 'expo-media-library'
import PagerView from 'react-native-pager-view';

export default function MediaSelection({ maxImage = 9, itemEachRow = 3, firstLoadNum = 24, handleNextBtn, handleBackBtn }) {
  const { width } = Dimensions.get('window')
  const indicatorLength = width/itemEachRow*0.16

  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [imageAfter, setImageAfter] = useState(null) 
  const [videoAfter, setVideoAfter] = useState(null)
  const [selectedImage, setSelectedImage] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(-1)

  const pageRef = useRef()
  const [currentPage, setCurrentPage] = useState(0)

  // flatlist getItemLayout
  const getItemLayout = (_, index) => {
    const length = width / itemEachRow;
    return {length, offset: length * index, index};
  }

  /**
   * handle next button is pressed
   * when images are selected, data would be an array of image info objects
   * when video is selected, assetInfo would be an video object
   */
  const handleNext = async () => {
    if (selectedImage.length > 0) {
      const selectedImageAssets = selectedImage.map((imageIndex) => photos[imageIndex])
      await Promise.all(selectedImageAssets.map((asset) => MediaLibrary.getAssetInfoAsync(asset)))
        .then((data) => {
          handleNextBtn(data)
        })
    }
    else if (selectedVideo >= 0) {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(videos[selectedVideo])
      handleNextBtn(assetInfo)
    }
  }

  /**
   * add selected image index into selectedImage array, and remove it if image is deselected
   * a maxium of 9 images allowed
   * @param {number} index selected image index in photos array
   * @returns void
   */
  const handleSelectImage = (index) => {
    if (selectedVideo >= 0) {
      setSelectedVideo(-1)
    }

    let tempSelected = [...selectedImage]
    if (tempSelected.indexOf(index) === -1){
      tempSelected.push(index)
    }
    else {
      const deleteIndex = tempSelected.indexOf(index)
      tempSelected.splice(deleteIndex, 1)
    }

    if (tempSelected.length > maxImage) return 

    setSelectedImage(tempSelected)
  }

  /**
   * setSelectedVideo to index of video that is selected, and remove it if the video is deselected
   * only one video is allowed
   * @param {number} index selected video index in videos state
   */
  const handleSelectVideo = (index) => {
    if (selectedImage) {
      setSelectedImage([])
    }
    if (selectedVideo === index) {
      setSelectedVideo(-1)
    }
    else {
      setSelectedVideo(index)
    }
  } 

  /**
   * render single image card in image pagerView
   * @param {Asset} item single Asset object from MediaLibrary in flatlist render data
   * @param {number} index item's index in flatlist render data
   * @returns 
   */
  const renderImageCard = ({item, index}) => {
    const singleSelected = selectedImage.indexOf(index) !== -1

    return (
      <TouchableHighlight onPress={() => handleSelectImage(index)}>
        <>
          {singleSelected &&
            <View style={[styles.indicatorView, {width: indicatorLength, height: indicatorLength}]}>
              <Text style={styles.indicatorText}>{selectedImage.indexOf(index) + 1}</Text>
            </View>
          }
          <Image 
            key={item.id}
            source={{ uri: item.uri }}
            style={{ width: width/itemEachRow, height: width/itemEachRow, opacity: singleSelected ? 0.5 : 1 }}
          />
        </>
      </TouchableHighlight>
    )
  }

  /**
   * render single video card in video pagerView
   * @param {Asset} item single Asset object from MediaLibrary in flatlist render data
   * @param {number} index item's index in flatlist render data
   * @returns 
   */
  const renderVideoCard = ({item, index}) => {
    const singleSelected = selectedVideo === index

    return (
      <TouchableHighlight onPress={() => handleSelectVideo(index)}>
        <>
          {singleSelected &&
            <View style={[styles.indicatorView, {width: indicatorLength, height: indicatorLength}]}>
              <AntDesign name="check" size={14} color="white" />
            </View>
          }
          <Image 
            key={item.id}
            source={{ uri: item.uri }}
            style={{ width: width/itemEachRow, height: width/itemEachRow, opacity: singleSelected ? 0.5 : 1 }}
          />
        </>
      </TouchableHighlight>
    )
  }

  /**
   * get photos from user's device
   * get 24 images at first time, first time is this page be rendered
   * get another 24 images after the last 24 images at each time the flatlist onEndReached
   */
  const getPhotos = () => {
    const params = {
      first: firstLoadNum,
      mediaType: 'photo',
      sortBy: [MediaLibrary.SortBy.creationTime]
    }

    // after: Asset ID of the last item returned on the previous page.
    if (imageAfter) params.after = imageAfter

    MediaLibrary.getAssetsAsync(params).then((data) => {
      setPhotos(prev => [...prev, ...data.assets])
      setImageAfter(data.endCursor)
    })
  }

  /**
   * get videos from user's device
   * get 24(default) videos at first time, first time is this page be rendered
   * get another 24(default) videos after the last 24 videos at each time the flatlist onEndReached
   */
  const getVideos = () => {
    const params = {
      first: firstLoadNum,
      mediaType: 'video',
      sortBy: [MediaLibrary.SortBy.creationTime]
    }

    // after: Asset ID of the last item returned on the previous page.
    if (videoAfter) params.after = videoAfter

    MediaLibrary.getAssetsAsync(params).then((data) => {
      setVideos(prev => [...prev, ...data.assets])
      setVideoAfter(data.endCursor)
    })
  }

  /**
   * get all photos and videos from user's device on initial render of this page
   */
  useEffect(() => {
    // ask for permission to visit user's local photos
    const requestPermission = async () => {
      await MediaLibrary.requestPermissionsAsync()
    }

    requestPermission()

    getPhotos()
    getVideos()
  }, [])

  return (
    <SafeAreaView style={styles.boxContainer}>
      <StatusBar />
      {/* Header of the page, include cancel and next btn */}
      <View style={styles.headView}>
        <TouchableOpacity onPress={handleBackBtn}>
          <AntDesign name="close" size={20} color="white" />
        </TouchableOpacity>

        <Text style={styles.headPostText}>Post</Text>

        {(selectedImage.length > 0 || selectedVideo >= 0) 
          ?
          <TouchableOpacity onPress={() => handleNext()}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
          :
          <Text style={styles.nextTextDisabled}>Next</Text>
        }
      </View>

      {/* Nav include photos and videos */}
      <View style={styles.navView}>
        <TouchableOpacity onPress={() => {pageRef.current.setPage(0); setCurrentPage(0)}}>
          <Text style={currentPage===0 ? styles.navTextSelected : styles.navTextDeselected}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {pageRef.current.setPage(1); setCurrentPage(1)}}>
          <Text style={currentPage===1 ? styles.navTextSelected : styles.navTextDeselected}>Video</Text>
        </TouchableOpacity>
      </View>

      {/* pager view, first flatlist render image list, second flatlist render video list */}
      <PagerView initialPage={0} style={{flex: 1}} ref={pageRef} onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}>
        <View key="1">
          <FlatList 
            data={photos}
            renderItem={(renderImageCard)}
            getItemLayout={getItemLayout}
            numColumns={itemEachRow}
            onEndReached={() => getPhotos()}
            onEndReachedThreshold={0.5}
            keyExtractor={(_, index) => index}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View key="2">
          <FlatList 
            data={videos}
            renderItem={renderVideoCard}
            getItemLayout={getItemLayout}
            numColumns={itemEachRow}
            onEndReached={() => getVideos()}
            onEndReachedThreshold={0.5}
            keyExtractor={(_, index) => index}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </PagerView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  boxContainer: {
    flex: 1,
    backgroundColor: "black"
  },
  headView: {
    display: "flex", 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  headPostText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700'
  }, 
  nextText: {
    color: "white",
    fontSize: 16,
    fontWeight: '400'
  },
  nextTextDisabled: {
    color: "grey",
    fontSize: 16,
    fontWeight: '400'
  },
  navView: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingVertical: 12,
  },
  navTextSelected: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700" 
  },
  navTextDeselected: {
    color: "lightgrey",
    fontSize: 14,
    fontWeight: "400" 
  },
  indicatorView: {
    position: 'absolute', 
    top: 5, 
    right: 5, 
    zIndex: 1, 
    backgroundColor: "#00E1DF", 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  indicatorText: {
    color: 'white',
    fontWeight: '700'
  }
});