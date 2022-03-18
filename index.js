import dotenv from 'dotenv/config'
import { Yandex } from './yandex.controller'

const yandex = new Yandex()
const ya_wm = yandex.wmCreate()
