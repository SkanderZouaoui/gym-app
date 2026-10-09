import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreatePostDto } from './dto/create-post.dto.js';
import type { CreateCommentDto } from './dto/create-comment.dto.js';

/** Fil d'actualité communautaire (section 4.1/8.7). */
@Injectable()
export class SocialFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findFeed(cursor?: string, take = 20) {
    const posts = await this.prisma.post.findMany({
      where: { deletedAt: null },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, photoKey: true } },
        _count: { select: { comments: true, reactions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    return Promise.all(
      posts.map(async (post) => ({
        ...post,
        imageUrl: post.imageKey ? await this.storageService.getReadUrl(post.imageKey) : null,
        author: {
          ...post.author,
          photoUrl: post.author.photoKey ? await this.storageService.getReadUrl(post.author.photoKey) : null,
        },
      })),
    );
  }

  createPost(authorId: string, dto: CreatePostDto) {
    return this.prisma.post.create({ data: { authorId, body: dto.body, imageKey: dto.imageKey } });
  }

  async deletePost(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('POST_NOT_FOUND');
    if (post.authorId !== userId) throw new ForbiddenException('NOT_YOUR_POST');
    await this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  getComments(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId, deletedAt: null },
      include: { author: { select: { firstName: true, lastName: true, photoKey: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  addComment(postId: string, authorId: string, dto: CreateCommentDto) {
    return this.prisma.comment.create({ data: { postId, authorId, body: dto.body } });
  }

  async toggleReaction(postId: string, userId: string) {
    const existing = await this.prisma.reaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
      return { reacted: false };
    }
    await this.prisma.reaction.create({ data: { postId, userId } });
    return { reacted: true };
  }

  /** Masquage par un admin suite à un signalement (section 4.4 : modération). */
  async hidePost(id: string, actorId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('POST_NOT_FOUND');

    const updated = await this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'HIDE_POST', entity: 'Post', entityId: id },
    });
    return updated;
  }
}
