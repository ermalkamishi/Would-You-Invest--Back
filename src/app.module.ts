import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StartupsModule } from './startups/startups.module';
import { InvestmentsModule } from './investments/investments.module';
import { BetsModule } from './bets/bets.module';
import { CommentsModule } from './comments/comments.module';
import { SimulatorModule } from './simulator/simulator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const dbSsl = configService.get<string>('DB_SSL');

        if (databaseUrl) {
          // Render internal URLs (dpg-xxxx without external domain) do NOT use SSL.
          // External URLs or DB_SSL=true require ssl: { rejectUnauthorized: false }.
          const isInternalRenderDb =
            databaseUrl.includes('dpg-') && !databaseUrl.includes('.render.com');
          const useSsl =
            dbSsl === 'true' || (dbSsl !== 'false' && !isInternalRenderDb);

          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: true,
            ...(useSsl
              ? {
                  ssl: {
                    rejectUnauthorized: false,
                  },
                }
              : {}),
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST') || 'localhost',
          port: Number(configService.get<number>('DB_PORT')) || 5432,
          username: configService.get<string>('DB_USER') || 'postgres',
          password: configService.get<string>('DB_PASSWORD') || 'postgres',
          database: configService.get<string>('DB_NAME') || 'captab',
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    UsersModule,
    AuthModule,
    StartupsModule,
    InvestmentsModule,
    BetsModule,
    CommentsModule,
    SimulatorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
