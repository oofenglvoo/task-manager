declare module 'lunar-javascript' {
  export interface Lunar {
    getDayInChinese(): string
    getMonthInChinese(): string
    getYearInGanZhi(): string
    getYearShengXiao(): string
    getJieQi(): string
    getFestivals(): string[]
    getOtherFestivals(): string[]
    getDay(): number
    getMonth(): number
  }

  export interface Solar {
    getYear(): number
    getMonth(): number
    getDay(): number
    getWeek(): number
    getLunar(): Lunar
    getFestivals(): string[]
    toYmd(): string
  }

  export interface SolarApi {
    fromYmd(year: number, month: number, day: number): Solar
  }

  export const Solar: SolarApi
}
