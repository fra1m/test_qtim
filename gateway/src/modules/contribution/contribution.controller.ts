//TODO
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  UnauthorizedException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ContributionService } from './contribution.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { JwtAuthGuard } from 'src/common/secure/guards/jwt-auth.guard';
import { ListContributionsDto } from './dto/list-contributions.dto';
import { ReqId } from 'src/common/http/req-id.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { UserModel } from 'src/modules/user/models/user.model';
import { UserService } from 'src/modules/user/user.service';
import {
  ContributionList,
  ContributionModel,
} from './models/contribution.model';
import { CacheHelper } from 'src/common/redis/redis.service';
import { AppLogger } from 'src/common/logger/logger.service';

const CONTRIBUTION_ID_CACHE_PREFIX = 'contrib:id';
const CONTRIBUTION_LIST_VERSION_KEY = 'contrib:list:version';

@Controller('contribution')
export class ContributionController {
  constructor(
    private readonly contributionService: ContributionService,
    private readonly userService: UserService,
    private readonly cache: CacheHelper,
    private readonly cfg: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  private getCacheTtlSec(): number {
    const raw = this.cfg.get<string>('REDIS_TTL_SEC');
    const ttl = Number(raw);
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 60;
  }

  private sortedQueryString(
    query: Record<string, unknown> | ListContributionsDto = {},
  ): string {
    return Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
  }

  private async getListVersion(): Promise<string> {
    let version = await this.cache.getPlain(CONTRIBUTION_LIST_VERSION_KEY);
    if (!version) {
      version = randomUUID();
      await this.cache.setPlain(CONTRIBUTION_LIST_VERSION_KEY, version);
    }
    return version;
  }

  private async bumpListVersion(): Promise<void> {
    await this.cache.setPlain(CONTRIBUTION_LIST_VERSION_KEY, randomUUID());
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createContributionDto: CreateContributionDto,
    @User() user: UserModel,
    @ReqId() reqId: string,
  ): Promise<ContributionModel> {
    const meta = { requestId: reqId };
    if (!user?.sub) {
      throw new UnauthorizedException('Вам необходимо авторизоваться');
    }

    const authorName =
      user.name?.trim() || user.email?.trim() || 'Unknown author';

    this.logger.info(
      { rid: reqId, userId: user.sub, title: createContributionDto?.title },
      'contribution.create started',
    );
    try {
      const created = await this.contributionService.create(meta, {
        ...createContributionDto,
        authorId: user.sub,
        authorName,
      });

      try {
        const updatedUser = await this.userService.addContributionId(
          meta,
          user.sub,
          created.id,
        );
        await this.cache.writeUserCache(updatedUser);
      } catch (err) {
        await this.contributionService.remove(meta, created.id, user.sub);
        throw err;
      }

      await this.cache.setJson(
        `${CONTRIBUTION_ID_CACHE_PREFIX}:${created.id}`,
        created,
        this.getCacheTtlSec(),
      );
      await this.bumpListVersion();

      this.logger.info(
        { rid: reqId, id: created.id, userId: user.sub },
        'contribution.create done',
      );
      return created;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'contribution.create failed');
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException('Create contribution failed');
    }
  }

  @Get()
  async findAll(
    @Query() query: ListContributionsDto,
    @ReqId() reqId: string,
  ): Promise<ContributionList> {
    const meta = { requestId: reqId };
    this.logger.info({ rid: reqId, query }, 'contribution.list started');
    try {
      const version = await this.getListVersion();
      const qs = this.sortedQueryString(query ?? {});
      const cacheKey = `contrib:list:${version}${qs ? `?${qs}` : ''}`;
      const cached = await this.cache.getJson<ContributionList>(cacheKey);
      if (cached) {
        this.logger.info(
          { rid: reqId, cacheKey, cached: true },
          'contribution.list done',
        );
        return cached;
      }

      const result = await this.contributionService.findAll(meta, query);
      await this.cache.setJson(cacheKey, result, this.getCacheTtlSec());
      this.logger.info(
        { rid: reqId, cacheKey, cached: false },
        'contribution.list done',
      );
      return result;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'contribution.list failed');
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException('Get contributions failed');
    }
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @ReqId() reqId: string,
  ): Promise<ContributionModel> {
    const meta = { requestId: reqId };
    this.logger.info({ rid: reqId, id }, 'contribution.get started');
    try {
      const cacheKey = `${CONTRIBUTION_ID_CACHE_PREFIX}:${id}`;
      const cached = await this.cache.getJson<ContributionModel>(cacheKey);
      if (cached) {
        this.logger.info(
          { rid: reqId, id, cached: true },
          'contribution.get done',
        );
        return cached;
      }

      const result = await this.contributionService.findOne(meta, id);
      await this.cache.setJson(cacheKey, result, this.getCacheTtlSec());
      this.logger.info(
        { rid: reqId, id, cached: false },
        'contribution.get done',
      );
      return result;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'contribution.get failed');
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException('Get contribution failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContributionDto: UpdateContributionDto,
    @User() user: UserModel,
    @ReqId() reqId: string,
  ): Promise<ContributionModel> {
    const meta = { requestId: reqId };
    if (!user?.sub) {
      throw new UnauthorizedException('Вам необходимо авторизоваться');
    }

    this.logger.info(
      { rid: reqId, id, userId: user.sub },
      'contribution.update started',
    );
    try {
      const updated = await this.contributionService.update(
        meta,
        id,
        updateContributionDto,
        user.sub,
      );

      await this.cache.setJson(
        `${CONTRIBUTION_ID_CACHE_PREFIX}:${id}`,
        updated,
        this.getCacheTtlSec(),
      );
      await this.bumpListVersion();

      this.logger.info(
        { rid: reqId, id, userId: user.sub },
        'contribution.update done',
      );
      return updated;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'contribution.update failed');
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException('Update contribution failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserModel,
    @ReqId() reqId: string,
  ): Promise<{ id: number }> {
    const meta = { requestId: reqId };
    if (!user?.sub) {
      throw new UnauthorizedException('Вам необходимо авторизоваться');
    }

    this.logger.info(
      { rid: reqId, id, userId: user.sub },
      'contribution.remove started',
    );
    try {
      const removed = await this.contributionService.remove(meta, id, user.sub);
      try {
        const updatedUser = await this.userService.removeContributionId(
          meta,
          user.sub,
          id,
        );
        await this.cache.writeUserCache(updatedUser);
      } finally {
        await this.cache.del(`${CONTRIBUTION_ID_CACHE_PREFIX}:${id}`);
        await this.bumpListVersion();
      }

      this.logger.info(
        { rid: reqId, id, userId: user.sub },
        'contribution.remove done',
      );
      return removed;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'contribution.remove failed');
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException('Remove contribution failed');
    }
  }
}
