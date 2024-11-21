function fileToGenerativePart(data: Uint8Array, mimeType: string) {
  return {
    inlineData: {
      data: btoa(String.fromCharCode(...data)),
      mimeType,
    },
  };
}

export default fileToGenerativePart;
