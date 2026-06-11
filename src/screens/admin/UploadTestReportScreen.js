import 'fast-text-encoding';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { PDFDocument, rgb } from 'pdf-lib';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../context/ThemeContext';
import ClayButton from '../../components/ClayButton';
import ClayCard from '../../components/ClayCard';

export default function UploadTestReportScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [logoUri, setLogoUri] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLogoUri(result.assets[0].uri);
        setLogoBase64(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking logo:', error);
      Alert.alert('Error', 'Failed to pick a logo.');
    }
  };

  const applyBrandingToPDF = async (pdfUri, currentLogoBase64) => {
    // Read PDF directly into an ArrayBuffer
    const pdfResponse = await fetch(pdfUri);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Embed the logo (pdf-lib takes the Base64 directly!)
    let embeddedLogo;
    try {
      embeddedLogo = await pdfDoc.embedPng(currentLogoBase64);
    } catch (pngError) {
      try {
        embeddedLogo = await pdfDoc.embedJpg(currentLogoBase64);
      } catch (jpgError) {
        throw new Error('The selected logo could not be embedded.');
      }
    }
    
    // Scale it
    const logoDims = embeddedLogo.scale(0.25);
    
    // Loop through every page
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Element 1 (Address)
      page.drawText('Address: GV Pride, 3rd Floor Gandipet Main Rd, Kokapet 500075, Telangana, India', { 
        x: 50, 
        y: height - 40, 
        size: 10, 
        color: rgb(0.3, 0.3, 0.3) 
      });
      
      // Element 2 (Contact)
      page.drawText('www.yelloclinics.com | info@yelloclinics.com | @yello.medi', { 
        x: 50, 
        y: height - 55, 
        size: 10, 
        color: rgb(0.3, 0.3, 0.3) 
      });
      
      // Element 3 (Logo Image)
      page.drawImage(embeddedLogo, { 
        x: width - logoDims.width - 40, 
        y: height - logoDims.height - 30, 
        width: logoDims.width, 
        height: logoDims.height 
      });
      
      // Element 4 (Sub-branding Text)
      page.drawText('Clinics Diagnostics', { 
        x: width - 150, 
        y: height - logoDims.height - 45, 
        size: 12, 
        color: rgb(0.3, 0.3, 0.3) 
      });
    }
    
    return await pdfDoc.saveAsBase64();
  };

  const handleFormatAndSave = async () => {
    if (!logoUri) {
      Alert.alert('Missing Logo', 'Please select a clinic logo first.');
      return;
    }

    try {
      const docRes = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      
      if (docRes.canceled || !docRes.assets || docRes.assets.length === 0) {
        return;
      }

      setIsProcessing(true);
      
      const brandedBase64 = await applyBrandingToPDF(docRes.assets[0].uri, logoBase64);
      
      const outputUri = FileSystem.documentDirectory + 'YelloMedi_Report_Formatted.pdf';
      await FileSystem.writeAsStringAsync(outputUri, brandedBase64, { encoding: FileSystem.EncodingType.Base64 });
      
      await Sharing.shareAsync(outputUri);
      
    } catch (error) {
      console.error('Error formatting PDF:', error);
      Alert.alert('Error', 'An error occurred while formatting the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Format Report</Text>

      <ClayCard style={styles.card}>
        <Text style={styles.label}>1. Select Clinic Logo</Text>
        <ClayButton
          title="Pick Logo Image"
          onPress={pickLogo}
          variant="secondary"
          style={styles.button}
        />
        
        {logoUri && (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: logoUri }} 
              style={{ width: 100, height: 100, resizeMode: 'contain' }} 
            />
          </View>
        )}

        <Text style={[styles.label, { marginTop: theme.spacing.xl }]}>2. Select & Format PDF</Text>
        <ClayButton
          title="Select & Format PDF"
          onPress={handleFormatAndSave}
          style={styles.button}
          disabled={isProcessing}
        />
        
        {isProcessing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Processing PDF...</Text>
          </View>
        )}
      </ClayCard>
    </ScrollView>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingTop: 40,
  },
  title: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  card: {
    width: '100%',
    padding: theme.spacing.lg,
  },
  label: {
    ...theme.typography.title,
    fontSize: 16,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  button: {
    marginBottom: theme.spacing.md,
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  loadingContainer: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    ...theme.typography.body,
  }
});
