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
} from '@nestjs/common';
import { ContributionService } from './contribution.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { JwtAuthGuard } from 'src/common/secure/guards/jwt-auth.guard';
import { ListContributionsDto } from './dto/list-contributions.dto';
import { ReqId } from 'src/common/http/req-id.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { UserModel } from 'src/modules/user/models/user.model';
import {
  ContributionList,
  ContributionModel,
} from './models/contribution.model';

@Controller('contribution')
export class ContributionController {
  constructor(private readonly contributionService: ContributionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createContributionDto: CreateContributionDto,
    @User() user: UserModel,
    @ReqId() reqId: string,
  ): Promise<ContributionModel> {
    if (!user?.sub) {
      throw new UnauthorizedException('Вам необходимо авторизоваться');
    }

    const meta = { requestId: reqId };
    const authorName =
      user.name?.trim() || user.email?.trim() || 'Unknown author';

    return this.contributionService.create(meta, {
      ...createContributionDto,
      authorId: user.sub,
      authorName,
    });
  }

  @Get()
  async findAll(
    @Query() query: ListContributionsDto,
    @ReqId() reqId: string,
  ): Promise<ContributionList> {
    const meta = { requestId: reqId };
    return await this.contributionService.findAll(meta, query);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @ReqId() reqId: string,
  ): Promise<ContributionModel> {
    const meta = { requestId: reqId };
    return await this.contributionService.findOne(meta, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContributionDto: UpdateContributionDto,
    @ReqId() reqId: string,
  ): Promise<ContributionModel> {
    const meta = { requestId: reqId };
    return await this.contributionService.update(
      meta,
      id,
      updateContributionDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @ReqId() reqId: string,
  ): Promise<{ id: number }> {
    const meta = { requestId: reqId };
    return await this.contributionService.remove(meta, id);
  }
}
