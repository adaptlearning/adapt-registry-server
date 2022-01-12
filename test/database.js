/* eslint-disable no-undef */
const expect = require('chai').expect
const { getPackageTable } = require('../database')
const packageTable = getPackageTable()

database.sequelize.options.logging = false

describe('Package', function () {
  describe('at creation', function () {
    it('should have 0 hit', function () {
      expect(packageTable.build().hits).to.equal(0)
    })

    it('should save creation date', function () {
      expect(packageTable.build()).to.have.property('createdAt')
    })
  })

  describe('validation', function () {
    it('should fail if url protocol is not git or https', function () {
      expect(packageTable.build({ url: 'lalala' }).validate()).to.have.property('url')
      expect(packageTable.build({ url: 'http://lalala' }).validate()).to.have.property('url')
      expect(packageTable.build({ url: 'git://lalala' }).validate()).to.be.a('null')
      expect(packageTable.build({ url: 'https://lalala' }).validate()).to.be.a('null')
    })
  })

  describe('behavior', function () {
    it('should add a hit', function () {
      const foobar = packageTable.build({ name: 'foo', url: 'git://bar' })
      expect(foobar.hits).to.equal(0)
      foobar.hit()
      expect(foobar.hits).to.equal(1)
    })
  })
})
