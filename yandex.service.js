import axios from 'axios'

export class YandexApi {
   constructor(token) {
      this.token = token
      this.computeUrl = `https://compute.api.cloud.yandex.net/compute/v1`
   }
   // ДИСКИ
   get disks() {
      const fetch = this.axiosInstance(`${this.computeUrl}/disks`)
      return {
         create: async (diskData) => { // Создать
            const { data } = await fetch.post('', diskData)
            return data.id
         },
         status: async (diskId) => { // Проверка статуса
            const { data } = await fetch.get(diskId)
            return data?.status
         }
      }
   }
   // ОБРАЗЫ
   images(folderId) {
      const fetch = this.axiosInstance(`${this.computeUrl}/images`)
      return {
         create: async (imageData) => { // Создать
            const { data } = await fetch.post('', imageData)
            return data.id
         },
         getSampleImage: async () => { // Список образов в указанной папке
            try {
               const { data } = await fetch.get(`?folderId=${folderId}`)
               return (data.images ? data.images : false)
            } catch (err) {
               return this.error('Ошибка получения списка образов', err)
            }
         },
         checkDiskStatus: async (diskId) => {
            const { data } = await fetch.get(diskId)
            console.log(data)
         }
      }
   }
   // ИНСТАНСЫ
   get instances() {
      const fetch = this.axiosInstance(`${this.computeUrl}/instances`)
      return {
         create: async (instanceData) => { // Создать
            const { data } = await fetch.post('', instanceData)
            return data.metadata.instanceId
         },
         list: async (folderId) => { // Получить список
            try {
               const { data } = await fetch.get(`?folderId=${folderId}`)
               return (data.instances ? data.instances : false)
            } catch (err) {
               return this.error('Ошибка получения списка инстансов', err)
            }
         },
         getById: async (instanceId) => { // Получить по ID
            const { data } = await fetch.get(instanceId)
            return data
         }
      }
   }
   // РЕСУРСЫ --
   get resources() {
      return {
         getClouds: async () => { // Облака
            const url = 'https://resource-manager.api.cloud.yandex.net/resource-manager/v1/clouds'
            const fetch = this.axiosInstance(url)
            try {
               const { data: { clouds }} = await fetch.get()
               return clouds
            } catch (err) {
               return this.error('Ошибка получения списка облаков', err)
            }
         },
         getFolders: async (cloudId) => { // Папки внутри облака
            const url = 'https://resource-manager.api.cloud.yandex.net/resource-manager/v1/folders'
            const fetch = this.axiosInstance(url)
            try {
               const { data: { folders }} = await fetch.get(`?cloudId=${cloudId}`)
               return folders
            } catch (err) {
               return this.error('Ошибка получения списка папок', err)
            }
         }
      }
   }

   static async iamToken() { // Токен авторизации
      const url = 'https://iam.api.cloud.yandex.net/iam/v1/tokens'
      const { data: { iamToken }} = await axios.post(url, {
         yandexPassportOauthToken: process.env.YANDEX_OAUTH_TOKEN
      })
      // console.log(iamToken)
      return iamToken
   }

   axiosInstance(url) {
      return axios.create({
         baseURL: url, headers: { Authorization: `Bearer ${this.token}`}
      })
   }

   error(text, err) {
      return {
         error: true, text: text, message: err.response ? err.response.data.message : err,
      }
   }
}
