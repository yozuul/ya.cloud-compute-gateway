import dotenv from 'dotenv/config'

import { Yandex } from './yandex.controller'

const yandex = new Yandex();
(async () => {
	await yandex.initApi()
	// Создать VM
	yandex.vmCreate()
	// Удалить VM
	// yandex.vmDelete('fhmmgna24ktrgl6t9185')
})()