import { v4 as uuidv4 } from 'uuid'

import { YandexApi } from './yandex.service.js'
import { cmdSync } from './utils/run-cmd-sync'

export class Yandex {
   async initApi() {
      this.token = await YandexApi.iamToken()
      this.api = new YandexApi(this.token)
   }
   async vmCreate() {
      // Получаем ID облака и папки по умолчанию
      const defaultCloudId = await this.getCloudId()
      const defaultFolderId = await this.getFolderId(defaultCloudId)
      // -- ОБРАЗ --
      // Создаём образ с диска основной машины
      // const imageId = await this.createImage(defaultFolderId)
      // --
      // Получаем ID основного образа
      const imageId = await this.getSampleImage(defaultFolderId)
      // --
      // Создаём диск с основного образа
      this.createDiskFromImage(defaultFolderId, imageId, createInstanceCb)
      // -- ОБРАЗ --
      // -- СНИМОК --
      // Создаём снимок с диска основной машины
      // const snapshotId = await this.createSnapshot(defaultFolderId)
      // --
      // Создаём диск с основного образа
      // this.createDiskFromSnapshot(defaultFolderId, createInstanceCb)
      // Создаём инстанс
      const createInstance = async (defaultFolderId, diskId) => {
         const instanse = await this.createInstanceFromDisk(defaultFolderId, diskId)
         return instanse
      }
      async function createInstanceCb (diskId) {
         createInstance(defaultFolderId, diskId)
      }
      // --
      // Проверяем инстанс
      // const checkInstance = await this.api.instances.getById(instance.id)
   }
   // Создание диска со снимка
   async createDiskFromSnapshot(folderId, createInstanceCb) {
      const data = {
         folderId: folderId,
         name: 'disk-' + uuidv4(),
         snapshotId: 'fd8lear6da1no8hsh0ur',
         zoneId: 'ru-central1-a',
         typeId: 'network-ssd',
         size: this.gb(5.5),
         blockSize: '4096'
      }
      console.log('СОЗДАНИЕ ДИСКА')
      const diskId = await this.api.disks.create(data)
      // Ожидаем подготовки диска
      const checkDiskStatus = async (timer) => {
         const status = await this.api.disks.status(diskId)
         console.log(`Статус диска: ${status} : ${timer}s`)
         if(status !== 'READY') {
            timer++
            setTimeout(checkDiskStatus, 1000, timer)
         } else {
            createInstanceCb(diskId)
         }
      }
      checkDiskStatus(0)
   }
   // Создание диска с образа
   async createDiskFromImage(folderId, imageId, createInstanceCb) {
      const data = {
         folderId: folderId,
         name: 'disk-' + uuidv4(),
         imageId: imageId,
         zoneId: 'ru-central1-a',
         typeId: 'network-ssd',
         size: this.gb(5.5),
         blockSize: '4096'
      }
      console.log('СОЗДАНИЕ ДИСКА')
      const diskId = await this.api.disks.create(data)
      // Ожидаем подготовки диска
      const checkDiskStatus = async (timer) => {
         const status = await this.api.disks.status(diskId)
         console.log(`Статус диска: ${status} : ${timer}s`)
         if(status !== 'READY') {
            timer++
            setTimeout(checkDiskStatus, 1000, timer)
         } else {
            createInstanceCb(diskId)
         }
      }
      checkDiskStatus(0)
   }
   // Резервирование IP
   async ipReserve(ip) {
      const response = await cmdSync('yc vpc address create --external-ipv4 zone=ru-central1-a')
      if(response.error) {
         console.log(response.data)
         throw new Error(`Ошибка резервирования IP => ${response.data[0]}`)
      }
      for (let element of response.data) {
         if(element.includes('address')) ip = element.split('address: ')[1]
      }
      console.log(`IP зарезервирован: ${ip}`)
      return ip
   }
   // Создание инстанса
   async createInstanceFromDisk(folderId, diskId) {
      // const ip = await this.ipReserve()
      console.log('СОЗДАНИЕ ИНСТАНСА')
      const instanceId = await this.api.instances.create({
         folderId: folderId,
         name: 'instance-' + uuidv4(),
         zoneId: 'ru-central1-a',
         platformId: 'standard-v3',
         resourcesSpec: {
            memory: this.gb(2),
            cores: '2',
            coreFraction: '100',
            gpus: '0'
         },
         // metadata: {
         // 	"ssh-keys": process.env.PUBLIC_SSH
         // },
         bootDiskSpec: {
            mode: 'READ_WRITE',
            deviceName: 'boot-disk',
            autoDelete: true,
            diskId: diskId
         },
         schedulingPolicy: {
            preemptible: true
         },
         networkInterfaceSpecs: [{
            subnetId: 'e9bfjp2v558fdnu9e7dq',
            primaryV4AddressSpec: {
               // address: '10.128.0.55',
               oneToOneNatSpec: {
                  ipVersion: 'IPV4',
                  // address: ip
               }
            }
         }],
         networkSettings: {
            type: 'STANDARD'
         },
         placementPolicy: {
            placementGroupId: 'fd8g2gtl9stah581jae3'
         }
      })
      if(instanceId?.error) {
         throw new Error(`${instanceId.text} => ${instanceId.message}`)
      }
      console.log(`ИНСТАНС: ${instanceId} СОЗДАН`)
      return {
         instanceId: instanceId,
         // ip: ip
      }
   }
   // Удаление инстанса
   async vmDelete(instanceId) {
      const deleteInstance = await this.api.instances.delete(instanceId)
      if(!deleteInstance?.error) {
         console.log(`ИНСТАНС: ${instanceId} УДАЛЁН`)
         return instanceId
      }
      throw new Error(`${deleteInstance.text} => ${deleteInstance.message}`)
   }
   // Получение ID основного образа
   async getSampleImage(folderId) {
      const images = await this.api.images.getSampleImage(folderId)
      if(!images?.error) {
         const mainImage = images.filter((i) => i.name === 'main-sample')
         return mainImage[0].id
      }
      throw new Error(`${images.text} => ${images.message}`)
   }
   // Создание снимка с основного инстанса
   async createSnapshot(folderId) {
      const snapshotId = this.api.snapshots.create({
         folderId: folderId,
         diskId: 'fhm0l2nrd4qsuraghfqo',
         name: 'test-snapshot'
      })
      if(snapshotId ?.error) {
         throw new Error(`${snapshotId.text} => ${snapshotId.message}`)
      }
      return snapshotId
   }
   // Создание образа из основного инстанса
   async createImage(folderId) {
      const instanceList = await this.api.instances.list(folderId)
      const mainInstance = instanceList.filter((i) => i.name === 'main')
      const mainDiskId = mainInstance[0].bootDisk.diskId

      const imageId = this.api.images.create({
         folderId: folderId,
         name: 'main-sample',
         description: 'Основной образ',
         typeId: 'network-ssd',
         zoneId: 'ru-central1-a',
         size: this.gb(5.5),
         blockSize: '4096',
         diskId: mainDiskId
      })
      if(imageId?.error) {
         throw new Error(`${imageId.text} => ${imageId.message}`)
      }
      return imageId
   }
   // Получение ID облака по умолчанию
   async getCloudId() {
      const clouds = await this.api.resources.getClouds()
      if(!clouds.error) {
         const { id } = clouds[0]
         return id
      }
      throw new Error(`${clouds.text} => ${clouds.message}`)
   }
   // Получение ID папки в облаке по умолчанию
   async getFolderId(cloudId) {
      const folders = await this.api.resources.getFolders(cloudId)
      if(!folders.error) {
         const { id } = folders[0]
         return id
      }
      throw new Error(`${folders.text} => ${folders.message}`)
   }
   gb(gb) {
      return (gb * 1073741824).toString()
   }
}
