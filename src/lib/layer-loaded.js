export default async function layerLoaded(id, map) {
  if (!map.getLayer(id)) {
    // we need to wait for when a layer is loaded, hence the Promise
    await new Promise(resolve => {
      const cb = (e) => {
        // check if the loaded layer has the current id
        if (e.sourceDataType === "metadata" && e.sourceId === id) {
          resolve();
        }
      };

      // add callback when sourcedata is updated
      map.on("sourcedata", cb);
    });
  }
}
