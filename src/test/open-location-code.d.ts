declare module 'open-location-code' {
  export interface CodeArea {
    latitudeLo: number
    longitudeLo: number
    latitudeHi: number
    longitudeHi: number
  }
  export class OpenLocationCode {
    encode(latitude: number, longitude: number, codeLength?: number): string
    decode(code: string): CodeArea
    isFull(code: string): boolean
  }
}
