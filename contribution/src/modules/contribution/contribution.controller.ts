import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContributionService } from './contribution.service';
import { CONTRIBUTIONS_PATTERNS } from 'src/contracts/contribution.patterns';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { ListContributionsDto } from './dto/list-contributions.dto';

@Controller()
export class ContributionController {
  constructor(
    @InjectPinoLogger(ContributionController.name)
    private readonly logger: PinoLogger,
    private readonly service: ContributionService,
  ) {}

  @MessagePattern(CONTRIBUTIONS_PATTERNS.CREATE)
  async create(
    @Payload()
    data: {
      meta?: { requestId?: string };
      createContributionDto: CreateContributionDto;
    },
  ) {
    this.logger.info(
      { rid: data.meta?.requestId, title: data.createContributionDto?.title },
      `${CONTRIBUTIONS_PATTERNS.CREATE} received`,
    );

    try {
      return await this.service.create(data.createContributionDto);
    } catch (e: any) {
      this.logger.error(
        { rid: data.meta?.requestId, err: e },
        `${CONTRIBUTIONS_PATTERNS.CREATE} failed`,
      );
      const status =
        typeof e?.status === 'number'
          ? e.status
          : typeof e?.statusCode === 'number'
            ? e.statusCode
            : undefined;
      throw new RpcException({
        message: e?.message ?? 'Create contribution failed',
        ...(status ? { status } : {}),
      });
    }
  }

  @MessagePattern(CONTRIBUTIONS_PATTERNS.GET_ALL)
  async findAll(
    @Payload()
    data: {
      meta?: { requestId?: string };
      query?: ListContributionsDto;
    },
  ) {
    this.logger.info(
      { rid: data.meta?.requestId, query: data.query },
      `${CONTRIBUTIONS_PATTERNS.GET_ALL} received`,
    );

    try {
      return await this.service.findAll(data.query ?? {});
    } catch (e: any) {
      this.logger.error(
        { rid: data.meta?.requestId, err: e },
        `${CONTRIBUTIONS_PATTERNS.GET_ALL} failed`,
      );
      const status =
        typeof e?.status === 'number'
          ? e.status
          : typeof e?.statusCode === 'number'
            ? e.statusCode
            : undefined;
      throw new RpcException({
        message: e?.message ?? 'Get contributions failed',
        ...(status ? { status } : {}),
      });
    }
  }

  @MessagePattern(CONTRIBUTIONS_PATTERNS.GET_BY_ID)
  async findOne(
    @Payload() data: { meta?: { requestId?: string }; id: number },
  ) {
    this.logger.info(
      { rid: data.meta?.requestId, id: data.id },
      `${CONTRIBUTIONS_PATTERNS.GET_BY_ID} received`,
    );

    try {
      return await this.service.findOne(data.id);
    } catch (e: any) {
      this.logger.error(
        { rid: data.meta?.requestId, err: e },
        `${CONTRIBUTIONS_PATTERNS.GET_BY_ID} failed`,
      );
      const status =
        typeof e?.status === 'number'
          ? e.status
          : typeof e?.statusCode === 'number'
            ? e.statusCode
            : undefined;
      throw new RpcException({
        message: e?.message ?? 'Get contribution failed',
        ...(status ? { status } : {}),
      });
    }
  }

  @MessagePattern(CONTRIBUTIONS_PATTERNS.UPDATE)
  async update(
    @Payload()
    data: {
      meta?: { requestId?: string };
      id: number;
      updateContributionDto: UpdateContributionDto;
    },
  ) {
    this.logger.info(
      { rid: data.meta?.requestId, id: data.id },
      `${CONTRIBUTIONS_PATTERNS.UPDATE} received`,
    );

    try {
      return await this.service.update(data.id, data.updateContributionDto);
    } catch (e: any) {
      this.logger.error(
        { rid: data.meta?.requestId, err: e },
        `${CONTRIBUTIONS_PATTERNS.UPDATE} failed`,
      );
      const status =
        typeof e?.status === 'number'
          ? e.status
          : typeof e?.statusCode === 'number'
            ? e.statusCode
            : undefined;
      throw new RpcException({
        message: e?.message ?? 'Update contribution failed',
        ...(status ? { status } : {}),
      });
    }
  }

  @MessagePattern(CONTRIBUTIONS_PATTERNS.REMOVE)
  async remove(@Payload() data: { meta?: { requestId?: string }; id: number }) {
    this.logger.info(
      { rid: data.meta?.requestId, id: data.id },
      `${CONTRIBUTIONS_PATTERNS.REMOVE} received`,
    );

    try {
      return await this.service.remove(data.id);
    } catch (e: any) {
      this.logger.error(
        { rid: data.meta?.requestId, err: e },
        `${CONTRIBUTIONS_PATTERNS.REMOVE} failed`,
      );
      const status =
        typeof e?.status === 'number'
          ? e.status
          : typeof e?.statusCode === 'number'
            ? e.statusCode
            : undefined;
      throw new RpcException({
        message: e?.message ?? 'Remove contribution failed',
        ...(status ? { status } : {}),
      });
    }
  }
}
