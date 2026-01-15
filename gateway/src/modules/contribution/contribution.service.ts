import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CONTRIBUTIONS_CLIENT } from 'src/common/rmq/rmq.module';
import { rpc } from 'src/common/rpc/rpc.util';
import { CONTRIBUTIONS_PATTERNS } from 'src/contracts/contribution/contribution.patterns';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { ListContributionsDto } from './dto/list-contributions.dto';
import {
  ContributionList,
  ContributionModel,
} from './models/contribution.model';

@Injectable()
export class ContributionService {
  constructor(
    @Inject(CONTRIBUTIONS_CLIENT)
    private readonly contributions: ClientProxy,
  ) {}

  async create(
    meta: { requestId: string },
    createContributionDto: CreateContributionDto & {
      authorId: number;
      authorName: string;
    },
  ): Promise<ContributionModel> {
    return await rpc<ContributionModel>(
      this.contributions,
      CONTRIBUTIONS_PATTERNS.CREATE,
      { meta, createContributionDto },
    );
  }

  async findAll(
    meta: { requestId: string },
    query: ListContributionsDto = {},
  ): Promise<ContributionList> {
    return await rpc<ContributionList>(
      this.contributions,
      CONTRIBUTIONS_PATTERNS.GET_ALL,
      { meta, query },
    );
  }

  async findOne(
    meta: { requestId: string },
    id: number,
  ): Promise<ContributionModel> {
    return await rpc<ContributionModel>(
      this.contributions,
      CONTRIBUTIONS_PATTERNS.GET_BY_ID,
      { meta, id },
    );
  }

  async update(
    meta: { requestId: string },
    id: number,
    updateContributionDto: UpdateContributionDto,
    actorId: number,
  ): Promise<ContributionModel> {
    return await rpc<ContributionModel>(
      this.contributions,
      CONTRIBUTIONS_PATTERNS.UPDATE,
      { meta, id, updateContributionDto, actorId },
    );
  }

  async remove(
    meta: { requestId: string },
    id: number,
    actorId: number,
  ): Promise<{ id: number }> {
    return await rpc<{ id: number }>(
      this.contributions,
      CONTRIBUTIONS_PATTERNS.REMOVE,
      { meta, id, actorId },
    );
  }
}
