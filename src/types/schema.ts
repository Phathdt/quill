export interface TableColumn {
  name: string
  dataType: string
  nullable: boolean
  defaultValue: string | null
  isPrimaryKey: boolean
}

export interface TableIndex {
  name: string
  columns: string[]
  isUnique: boolean
  isPrimary: boolean
}

export interface ForeignKey {
  name: string
  column: string
  referencesTable: string
  referencesColumn: string
}

export interface TableStructure {
  tableName: string
  columns: TableColumn[]
  indexes: TableIndex[]
  foreignKeys: ForeignKey[]
}
