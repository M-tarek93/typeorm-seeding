import 'reflect-metadata'
import { DataSource, ObjectType } from 'typeorm'

import { EntityFactory } from './entity-factory.js'
import { EntityFactoryDefinition, Factory, FactoryFunction, SeederConstructor, Seeder } from './types.js'
import { getNameOfEntity } from './utils/factory.util.js'
import { loadFiles, importFiles } from './utils/file.util.js'
import { ConfigureOption, configureConnection, getConnectionOptions, createConnection } from './connection.js'

// -------------------------------------------------------------------------
// Handy Exports
// -------------------------------------------------------------------------

export * from './importer.js'
export * from './connection.js'
export { Factory, Seeder } from './types.js'
export { times } from './helpers.js'

// -------------------------------------------------------------------------
// Types & Variables
// -------------------------------------------------------------------------
;(global as any).seeder = {
  entityFactories: new Map<string, EntityFactoryDefinition<any, any>>(),
}

// -------------------------------------------------------------------------
// Facade functions
// -------------------------------------------------------------------------

export const define = <Entity, Context>(entity: ObjectType<Entity>, factoryFn: FactoryFunction<Entity, Context>) => {
  ;(global as any).seeder.entityFactories.set(getNameOfEntity(entity), {
    entity,
    factory: factoryFn,
  })
}

export const factory: Factory = <Entity, Context>(entity: ObjectType<Entity>) => (context?: Context) => {
  const name = getNameOfEntity(entity)
  const entityFactoryObject = (global as any).seeder.entityFactories.get(name)
  return new EntityFactory<Entity, Context>(name, entity, entityFactoryObject.factory, context)
}

export const runSeeder = async (clazz: SeederConstructor): Promise<any> => {
  const seeder: Seeder = new clazz()
  const connection = await createConnection()
  return seeder.run(factory, connection)
}

// -------------------------------------------------------------------------
// Facade functions for testing
// -------------------------------------------------------------------------
export const useRefreshDatabase = async (options: ConfigureOption = {}): Promise<DataSource> => {
  configureConnection(options)
  const option = await getConnectionOptions()
  const connection = await createConnection(option)
  if (connection && connection.isInitialized) {
    await connection.dropDatabase()
    await connection.synchronize()
  }
  return connection
}

export const tearDownDatabase = async (): Promise<void> => {
  const connection = await createConnection()
  return connection && connection.isInitialized ? connection.close() : undefined
}

export const useSeeding = async (options: ConfigureOption = {}): Promise<void> => {
  configureConnection(options)
  const option = await getConnectionOptions()
  const factoryFiles = loadFiles(option.factories)
  await importFiles(factoryFiles)
}
