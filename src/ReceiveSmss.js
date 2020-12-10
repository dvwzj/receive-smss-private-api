import _ from 'lodash'
import { JSDOM } from 'jsdom'
import jQuery from 'jquery'
import lookup from 'country-code-lookup'
import Sugar from 'sugar'
import { ReqFastPromise } from 'req-fast-promise'

export default class ReceiveSmss {
    constructor() {
        Object.defineProperty(this, '$http', {
            value: new ReqFastPromise({
                baseURL: 'https://receive-smss.com',
                headers: {
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
                },
            }),
        })
    }
    async phones(filterCountry) {
        try {
            const res = await this.$http.get('/')
            const $ = jQuery(new JSDOM(res.data).window)
            const numbers = _($('.number-boxes .number-boxes-item'))
                .map((div) => {
                    const number = $(div).find('.number-boxes-itemm-number').text()
                    let country = $(div).find('.number-boxes-item-country').text()
                    if (country.toLowerCase() === 'russian federation') {
                        country = 'Russia'
                    }
                    const lookupCountry = lookup.byCountry(country)
                    let countryCode
                    if (lookupCountry) {
                        countryCode = lookupCountry.internet
                    }
                    return {
                        number,
                        country,
                        countryCode,
                    }
                })
                .uniq()
                .value()
            return _.filter(numbers, (item) => {
                if (!filterCountry) {
                    return true
                }
                return _.includes(
                    _.filter([
                        item.country.toLowerCase(),
                        item.countryCode ? item.countryCode.toLowerCase() : null
                    ]),
                    filterCountry.toLowerCase()
                )
            })
        } catch (e) {
            console.error(e)
        }
    }
    async inbox(number) {
        try {
            const index = await this.$http.get('/')
            const res = await this.$http.get(`/sms/${number.replace('+', '')}/`, {
                cookies: index.cookies,
            })
            const $ = jQuery(new JSDOM(res.data).window)
            const inboxes = _($('.list-view tbody tr'))
                .map((tr) => {
                    const sender = $(tr).find('td').eq(1).text()
                    const humanized = $(tr).find('td').eq(4).text()
                    const message = $(tr).find('td').eq(5).text()
                    return {
                        sender,
                        time: {
                            humanized,
                            time: Sugar.Date.format(Sugar.Date.create(humanized), `{yyyy}-{MM}-{dd} {hh}:${humanized.includes('day') || humanized.includes('hour') ? 'xx' : '{mm}'}:${humanized.includes('day') || humanized.includes('hour') || humanized.includes('minute') ? 'xx' : '{ss}'}`)
                        },
                        message,
                    }
                })
                .value()
            return inboxes
        } catch (e) {
            console.error(e)
        }
    }
    async listen(number, cb = () => {}, intervalDuration = 5000) {
        return new Promise(async (resolve, reject) => {
            let interval
            const callback = {
                resolve(data) {
                    clearInterval(interval)
                    interval = null
                    resolve(data)
                },
                reject(error) {
                    clearInterval(interval)
                    interval = null
                    reject(error)
                }
            }
            const inboxes = await this.inbox(number)
            cb(inboxes, callback)
            interval = setInterval(async () => {
                const inboxes = await this.inbox(number)
                cb(inboxes, callback)
            }, intervalDuration)
        })
    }
}