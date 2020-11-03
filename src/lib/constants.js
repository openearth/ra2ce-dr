export const CENTER_LATITUDE = 18.7009047;
export const CENTER_LONGITUDE = -70.1654584;

export const MAP_CENTER = [CENTER_LONGITUDE, CENTER_LATITUDE];

export const MAP_ZOOM = 6.8;

export const MAP_BASELAYERS = [
  'light',
  'satellite',
].map(layer => ({
  style: `mapbox://styles/mapbox/${ layer }-v9`,
  title: layer,
  thumbnail: `/thumbnails/${ layer }.png`
}));

export const MAP_BASELAYER_DEFAULT = MAP_BASELAYERS[0];
