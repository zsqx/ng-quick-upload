self.onmessage = data => {
    let fileReader = new FileReader();
    fileReader.onload = e => {
        self.postMessage({
            base64: e.target.result,
        });
        self.close();
    };
    fileReader.readAsDataURL(data.data.file);
};
