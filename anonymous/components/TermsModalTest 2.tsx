import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import TermsAcceptanceModal from './TermsAcceptanceModal';

export default function TermsModalTest() {
  const [showModal, setShowModal] = useState(true);
  
  const handleAccept = () => {
    console.log('Terms accepted');
    setShowModal(false);
  };
  
  const handleDecline = () => {
    console.log('Terms declined');
    setShowModal(false);
  };
  
  return (
    <View style={styles.container}>
      <Button 
        title="Show Terms Modal" 
        onPress={() => setShowModal(true)} 
      />
      
      <TermsAcceptanceModal
        visible={showModal}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 9999,
  },
});
