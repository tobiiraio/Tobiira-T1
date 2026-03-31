import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from './schemas/property.schema';
import { Block, BlockSchema } from './schemas/block.schema';
import { Unit, UnitSchema } from './schemas/unit.schema';
import { Amenity, AmenitySchema } from './schemas/amenity.schema';
import { PropertiesRepository } from './properties.repository';
import { BlocksRepository } from './blocks.repository';
import { UnitsRepository } from './units.repository';
import { AmenitiesRepository } from './amenities.repository';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: Property.name, schema: PropertySchema },
        { name: Block.name, schema: BlockSchema },
        { name: Unit.name, schema: UnitSchema },
        { name: Amenity.name, schema: AmenitySchema },
      ],
      'persta',
    ),
  ],
  providers: [
    PropertiesRepository,
    BlocksRepository,
    UnitsRepository,
    AmenitiesRepository,
    PropertiesService,
  ],
  controllers: [PropertiesController],
  exports: [UnitsRepository],
})
export class PropertiesModule {}
