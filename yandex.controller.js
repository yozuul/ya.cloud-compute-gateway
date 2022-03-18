import { YandexApi } from './yandex.service.js'
import { cmdSync } from './utils/run-cmd-sync'

export class Yandex {
   async wmCreate() {
      // Генерим токен
      const token = await YandexApi.iamToken()
      this.api = new YandexApi(token)
      // Получаем ID облака и папки по умолчанию
      const defaultCloudId = await this.getCloudId()
      const defaultFolderId = await this.getFolderId(defaultCloudId)
      // --
      // Создаём образ с диска основной машины
      // const imageId = await this.createImage(defaultFolderId)
      // --
      // Проверяем существующие образы
      // const imageList = await this.api.images(defaultFolderId).list()
      // --
      // Получаем ID основного образа
      const imageId = await this.getSampleImage(defaultFolderId)
      // --
      // Создаём диск с основного образа
      const diskId = await this.createDiskFromImage(defaultFolderId, imageId)
      // --
      // Создаём инстанс
      const instance = await this.createInstance(defaultFolderId, diskId)
      // --
      // Проверяем инстанс
      // const checkInstance = await this.api.instances.getById(instance.id)
   }

   async createInstance(folderId, diskId) {
      const ip = await this.ipReserve()
      const instanceId = await this.api.instances.create({
         folderId: folderId,
         name: "vm-1-api-test",
         description: "Тестовая ВМ-1 созданная по API",
         zoneId: "ru-central1-a",
         platformId: "standard-v3",
         resourcesSpec: {
            memory: "2147483648",
            cores: "2",
            coreFraction: "100",
            gpus: "0"
         },
         // metadata: {
         // 	"ssh-keys": process.env.PUBLIC_SSH
         // },
         bootDiskSpec: {
            mode: "READ_WRITE",
            deviceName: "someId",
            autoDelete: false,
            diskId: diskId
         },
         schedulingPolicy: {
            preemptible: true
         },
         networkInterfaceSpecs: [{
            subnetId: 'e9bfjp2v558fdnu9e7dq',
            primaryV4AddressSpec: {
               address: '10.128.0.55',
               oneToOneNatSpec: {
                  ipVersion: 'IPV4',
                  address: ip // 178.154.224.110,
               }
            }
         }],
         networkSettings: {
            type: "STANDARD"
         },
         placementPolicy: {
            placementGroupId: "fd8g2gtl9stah581jae3"
         }
      })

      return {
         instanceId: instanceId, ip: ip
      }
   }

   // Настройки сети
   async ipReserve(ip) {
      const response = await cmdSync('yc vpc address create --external-ipv4 zone=ru-central1-a')
      if(!response.err) {
         for (let element of response.data) {
            if(element.includes('address')) ip = element.split('address: ')[1]
         }
         console.log(ip)
         return ip
      } else {
         console.log(response.data)
         throw new Error('Ошибка резервирования IP')
      }
   }

   // Создание диска с образа
   async createDiskFromImage(folderId, imageId) {
      const data = {
         folderId: folderId,
         name: 'test',
         description: "test",
         imageId: imageId,
         zoneId: "ru-central1-a",
         typeId: "network-ssd",
         size: "5368709120",
         blockSize: "4096"
      }

      const diskId = await this.api.disks.create(data)
      return diskId
   }
   // Получение ID основного образа
   async getSampleImage(folderId) {
      const images = await this.api.images(folderId).getSampleImage()
      if(!images?.error) {
         const mainImage = images.filter((i) => i.name === 'main-sample')
         return mainImage[0].id
      } else {
         throw new Error(`${images.text} | ${images.message}`)
      }
   }
   // Созданме образа из основного инстанса
   async createImage(folderId) {
      const instanceList = await this.api.instances.list(folderId)
      const mainInstance = instanceList.filter((i) => i.name === 'main')
      const mainDiskId = mainInstance[0].bootDisk.diskId
      try {
         const imageId = this.api.images().create({
            folderId: folderId,
            name: 'main-sample',
            description: 'Основной образ',
            typeId: "network-ssd",
            zoneId: "ru-central1-a",
            size: "5368709120",
            blockSize: "4096",
            diskId: mainDiskId
         })
         return imageId
      } catch (error) {
         throw new Error ('Ошибка создания образа')
      }
   }

   // Получение ID облака по умолчанию
   async getCloudId() {
      const clouds = await this.api.resources.getClouds()
      if(!clouds.error) {
         const { id } = clouds[0]
         return id
      } else {
         throw new Error(`${clouds.text} | ${clouds.message}`)
      }
   }
   // Получение ID папки в облаке по умолчанию
   async getFolderId(cloudId) {
      const folders = await this.api.resources.getFolders(cloudId)
      if(!folders.error) {
         const { id } = folders[0]
         return id
      } else {
         throw new Error(`${folders.text} | ${folders.message}`)
      }
   }
}
