export type GeoCommune = {
  id: string
  name: string
}

export type GeoRegion = {
  id: string
  name: string
  communes: GeoCommune[]
}

export type GeoCatalog = {
  regions: GeoRegion[]
}
