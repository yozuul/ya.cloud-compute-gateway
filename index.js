import dotenv from 'dotenv/config'

import { Yandex } from './yandex.controller'

const yandex = new Yandex();
(async () => {
	await yandex.initApi()
	// Создать WM
	yandex.wmCreate()
	// Удалить WM
	// yandex.wmDelete('fhmmgna24ktrgl6t9185')
})()