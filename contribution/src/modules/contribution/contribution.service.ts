import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContributionEntity } from './entities/contribution.entity';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { ListContributionsDto } from './dto/list-contributions.dto';

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class ContributionService {
  constructor(
    @InjectRepository(ContributionEntity)
    private readonly repo: Repository<ContributionEntity>,
  ) {}

  async create(dto: CreateContributionDto): Promise<ContributionEntity> {
    const entity = this.repo.create({
      title: dto.title,
      description: dto.description,
      publishedAt: new Date(dto.publishedAt),
      authorId: dto.authorId,
      authorName: dto.authorName,
    });

    return await this.repo.save(entity);
  }

  async findAll(
    query: ListContributionsDto = {},
  ): Promise<PaginatedResult<ContributionEntity>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));

    const qb = this.repo.createQueryBuilder('c');

    if (query.authorId) {
      qb.andWhere('c.authorId = :authorId', { authorId: query.authorId });
    }

    if (query.publishedFrom) {
      qb.andWhere('c.publishedAt >= :from', {
        from: new Date(query.publishedFrom),
      });
    }

    if (query.publishedTo) {
      qb.andWhere('c.publishedAt <= :to', {
        to: new Date(query.publishedTo),
      });
    }

    qb.orderBy('c.publishedAt', 'DESC');

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findOne(id: number): Promise<ContributionEntity> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new HttpException('Contribution not found', HttpStatus.NOT_FOUND);
    }
    return entity;
  }

  async update(
    id: number,
    dto: UpdateContributionDto,
    actorId?: number,
  ): Promise<ContributionEntity> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new HttpException('Contribution not found', HttpStatus.NOT_FOUND);
    }
    if (!actorId) {
      throw new HttpException(
        'Forbidden: actor is required',
        HttpStatus.FORBIDDEN,
      );
    }
    if (entity.authorId !== actorId) {
      throw new HttpException(
        'Forbidden: not your contribution',
        HttpStatus.FORBIDDEN,
      );
    }

    if (typeof dto.title === 'string') {
      entity.title = dto.title;
    }
    if (typeof dto.description === 'string') {
      entity.description = dto.description;
    }
    if (dto.publishedAt) {
      entity.publishedAt = new Date(dto.publishedAt);
    }

    return await this.repo.save(entity);
  }

  async remove(id: number, actorId?: number): Promise<{ id: number }> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new HttpException('Contribution not found', HttpStatus.NOT_FOUND);
    }
    if (!actorId) {
      throw new HttpException(
        'Forbidden: actor is required',
        HttpStatus.FORBIDDEN,
      );
    }
    if (entity.authorId !== actorId) {
      throw new HttpException(
        'Forbidden: not your contribution',
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.repo.delete(id);
    if (!result.affected) {
      throw new HttpException('Contribution not found', HttpStatus.NOT_FOUND);
    }
    return { id };
  }
}
