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
          // Internal Render DB URLs (dpg-xxxx without .render.com) do not use SSL.
          // External DB URLs (Render external, Neon, Supabase) REQUIRE SSL/TLS.
          const isInternalRenderDb =
            databaseUrl.includes('dpg-') && !databaseUrl.includes('.render.com');
          const useSsl =
            dbSsl === 'true' || (dbSsl !== 'false' && !isInternalRenderDb);

          const sslOption = useSsl ? { rejectUnauthorized: false } : false;

          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: true,
            ssl: sslOption,
            extra: {
              ssl: sslOption,
            },
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
