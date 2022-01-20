import Sequelize from 'sequelize'
import { CONNECTION_STRING } from './constants.js'

export async function getPackageTable ({
  connectionString = CONNECTION_STRING
} = {}) {
  const sequelize = new Sequelize(connectionString, { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } })
  await sequelize.authenticate()
  // Define table
  const packageTable = sequelize.define('Package', {
    name: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false
    },
    url: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isGitUrl (value) {
          if (!value.match(/^git:\/\//) && !value.match(/^https:\/\//)) throw new Error('is not correct format')
        }
      },
      get () {
        // Return https:// instead of git:// urls, reference https://github.com/bower/bower/issues/2610
        const url = this.getDataValue('url').replace('git://github.com', 'https://github.com')
        return (String(url).lastIndexOf('.git') !== -1) ? url : url + '.git'
      }
    },
    hits: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    }
  })
  // Table methods
  Object.assign(packageTable, {
    async all () {
      return packageTable.findAll({ order: Sequelize.literal('name DESC') })
    },
    async find (name) {
      return await packageTable.findOne({ where: { name: { [Sequelize.Op.eq]: name } } })
    },
    async search (term) {
      return await packageTable.findAll({ where: { name: { [Sequelize.Op.iLike]: `%${term}%` } }, order: Sequelize.literal('name DESC') })
    },
    async unregister (name) {
      return await packageTable.destroy({ where: { name: { [Sequelize.Op.eq]: name } } })
    }
  })
  // Item methods
  Object.assign(packageTable.prototype, {
    async register () {
      await this.save()
    },
    async rename (newName) {
      this.name = newName
      await this.save()
    },
    async hit () {
      this.hits += 1
      await this.save()
    }
  })
  await packageTable.sync()
  // Create index
  try {
    await sequelize.getQueryInterface().addIndex('Packages', ['name'])
  } catch (err) {
  }
  return packageTable
}
